/**
	Copyright 2015 Patrick George Wyndham Smith
*/

import React, { createElement, createClass as createComponent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Immutable from 'immutable';

import {
	findParticularSubsectionOptionsInList,
	findParticularBlockTypeOptionsWithGroupAndTypeInMap,
	findParticularTraitOptionsInList
} from './types';

import * as HTMLRepresentationAssistant from './HTMLRepresentation';


function isPresentString(value) {
	return (typeof value === 'string' && value.trim().length > 0);
}

function createElementFactoryMergingProps(type, baseProps, children) {
	return (additionalProps) => {
		let mergedProps = Object.assign({}, baseProps, additionalProps);

		// Merge the class name
		delete mergedProps.className;
		let mergedClassNames = [baseProps.className, additionalProps.className].filter(isPresentString).join(' ').trim();
		if (mergedClassNames != '') {
			mergedProps.className = mergedClassNames;
		}

		return createElement(type, mergedProps, children);
	}
}

function reactElementForWrappingChildWithTraits(child, traits, traitsSpecs) {
	if (true) {
		traits.forEach(function(traitValue, traitID) {
			if (traitValue == null || traitValue === false) {
				return;
			}

			let traitOptions = findParticularTraitOptionsInList(traitID, traitsSpecs);

			let valueForRepresentation;
			// Fields
			if (traitOptions.has('fields')) {
				valueForRepresentation = Immutable.Map({
					'originalElement': child,
					'fields': traitValue
				});
			}
			// On/off trait
			else {
				valueForRepresentation = Immutable.Map({
					'originalElement': child
				});
			}

			if (traitOptions.has('innerHTMLRepresentation')) {
				let HTMLRepresentation = traitOptions.get('innerHTMLRepresentation');
				if (HTMLRepresentation === false) {
					// For example, hide trait
					child = null;
				}
				else if (HTMLRepresentationAssistant.isValidHTMLRepresentationType(HTMLRepresentation)) {
					child = HTMLRepresentationAssistant.createReactElementsForHTMLRepresentationAndValue(
						HTMLRepresentation, valueForRepresentation
					);
				}
			}

			if (child != null && traitOptions.has('afterHTMLRepresentation')) {
				let HTMLRepresentation = traitOptions.get('afterHTMLRepresentation');
				if (HTMLRepresentationAssistant.isValidHTMLRepresentationType(HTMLRepresentation)) {
					let afterElements = HTMLRepresentationAssistant.createReactElementsForHTMLRepresentationAndValue(
						HTMLRepresentation, valueForRepresentation
					);

					if (afterElements) {
						if (!Array.isArray(child)) {
							child = [child];
						}

						child = child.concat(afterElements);
					}
				}
			}
		});

		return child;
	}
	else {
		// Factory for child, tries to keep as is if not attributes passed.
		let elementFactory = (additionalProps) => {
			if (additionalProps && Object.keys(additionalProps).length > 0) {
				return createElementFactoryMergingProps('span', {key: 'span'}, child)(additionalProps);
			}
			else {
				return child;
			}
		};

		if (traits.has('italic')) {
			elementFactory = createElementFactoryMergingProps('em', {key: 'italic'}, elementFactory());
		}

		if (traits.has('bold')) {
			elementFactory = createElementFactoryMergingProps('strong', {key: 'bold'}, elementFactory());
		}

		if (traits.has('link')) {
			var link = traits.get('link');
			var linkTypeChoice = link.get('typeChoice');
			var linkType = linkTypeChoice.get('selectedChoiceID');
			var values = linkTypeChoice.get('selectedChoiceValues');

			if (linkType === 'URL') {
				elementFactory = createElementFactoryMergingProps('a', {
					key: 'link/URL',
					href: values.get('URL')
				}, elementFactory());
			}
			else if (linkType === 'email') {
				elementFactory = createElementFactoryMergingProps('a', {
					key: 'link/email',
					href: 'mailto:' + values.get('emailAddress'),
				}, elementFactory());
			}
		}

		let additionalProps = {};
		let additionalClassNames = [];

		if (traits.has('class')) {
			var classNames = traits.getIn(['class', 'classNames']);
			if (classNames && classNames !== '') {
				additionalClassNames.push(classNames);
			}
		}

		if (additionalClassNames.length) {
			additionalProps.className = additionalClassNames.join(' ');
		}

		return elementFactory(additionalProps);
	}
};


function reactElementsForWrappingSubsectionChildren(subsectionType, subsectionElements, subsectionsSpecs, index) {
	let subsectionInfo = findParticularSubsectionOptionsInList(subsectionType, subsectionsSpecs);

	let outerTagName = subsectionInfo.get('outerHTMLTagName');
	if (outerTagName) {
		// Wrap elements in holder element. Return type is array, so wrap in an array too.
		return [
			createElement(outerTagName, {
				key: `outerElement-${index}`,
			}, subsectionElements)
		];
	}
	else {
		return subsectionElements;
	}
};

function reactElementsForSubsectionChild(
	subsectionType, blockTypeGroup, blockType, contentElements, traits, blockTypeOptions, blockIndex, subsectionsSpecs, ignoreOuter
) {
	let subsectionInfo = findParticularSubsectionOptionsInList(subsectionType, subsectionsSpecs);

	let blockCreationOptions = subsectionInfo.get('blockHTMLOptions');
	let subsectionChildHTMLRepresentation = subsectionInfo.get('childHTMLRepresentation');

	var tagNameForBlock = blockTypeOptions.get('outerHTMLTagName', 'div');
	if (blockCreationOptions) {
		if (blockCreationOptions.get('noParagraph', false) && tagNameForBlock === 'p') {
			tagNameForBlock = null;
		}
	}
    
    if (ignoreOuter) {
        tagNameForBlock = null;
    }

	var innerElements;
	if (!!tagNameForBlock) {
		// Nest inside, e.g. <li><h2>
		innerElements = [
			createElement(tagNameForBlock, {
				key: `block-${blockIndex}`
			}, contentElements)
		];
	}
	else {
		innerElements = contentElements;
	}

	/*
	if (traits) {
		innerElements = [
			reactElementForWrappingChildWithTraits(innerElements, traits)
		];
	}
	*/

	if (subsectionChildHTMLRepresentation) {
		const valueForRepresentation = Immutable.Map({
			'originalElement': innerElements
		});

		return HTMLRepresentationAssistant.createReactElementsForHTMLRepresentationAndValue(
			subsectionChildHTMLRepresentation, valueForRepresentation, `portionChild-${blockIndex}`
		);
	}
	else {
		return innerElements;
	}
};

function reactElementsWithBlocks(blocksImmutable, specsImmutable, { adjustBlock, htmlRepresentationForBlock, renderBlock } = {}) {
	let subsectionsSpecs = specsImmutable.get('subsectionTypes', Immutable.List());
	let traitsSpecs = specsImmutable.get('traitTypes', Immutable.List());
	let blockGroupIDsToTypesMap = specsImmutable.get('blockTypesByGroup', Immutable.Map());

	let mainElements = [];
	let currentSubsectionType = specsImmutable.get('defaultSubsectionType', 'normal');
	let currentSubsectionElements = [];

	const processCurrentSubsectionChildren = () => {
		if (currentSubsectionElements.length > 0) {
			mainElements = mainElements.concat(
				reactElementsForWrappingSubsectionChildren(
					currentSubsectionType, currentSubsectionElements, subsectionsSpecs, mainElements.length
				)
			);
			currentSubsectionElements = [];
		}
	};

	blocksImmutable.forEach((block, blockIndex) => {
        if (adjustBlock) {
            block = adjustBlock(block);
        }
        
		const typeGroup = block.get('typeGroup');
		const type = block.get('type');
        let ignoreOuter = false;

		if (typeGroup === 'subsection') {
			// Wrap last elements.
			processCurrentSubsectionChildren();

			currentSubsectionType = type;
		}
		else {
			var blockTypeOptions = findParticularBlockTypeOptionsWithGroupAndTypeInMap(
				typeGroup, type, blockGroupIDsToTypesMap
			);

			let elements;
            
            if (!!renderBlock) {
                elements = renderBlock(block);
                ignoreOuter = !!elements;
            }

            if (!elements) {
                if (typeGroup === 'particular' || typeGroup === 'media') {
                    const value = block.get('value', Immutable.Map());
                    const valueForRepresentation = Immutable.Map({
                        'fields': value
                    });
                    
                    let HTMLRepresentation;
                    
                    if (!!htmlRepresentationForBlock) {
                        HTMLRepresentation = htmlRepresentationForBlock(block)
                    }
                    
                    if (!HTMLRepresentation) { 
                        HTMLRepresentation = blockTypeOptions.get('innerHTMLRepresentation')
                    }
                    
                    if (HTMLRepresentation) {
                        elements = HTMLRepresentationAssistant.createReactElementsForHTMLRepresentationAndValue(
                            HTMLRepresentation, valueForRepresentation
                        );
                    }
                }
                else if (typeGroup === 'text') {
                    elements = block.get('textItems').map(function(textItem) {
                        let itemType = textItem.get('type');
                        if (itemType === 'text') {
                            let element = textItem.get('text');
                            let traits = textItem.get('traits');

                            if (traits) {
                                element = reactElementForWrappingChildWithTraits(element, traits, traitsSpecs);
                            }

                            return element;
                        }
                        else if (itemType === 'lineBreak') {
                            return createElement('br');
                        }
                        else if (itemType === 'catalogItem') {
                            return null; // TODO
                        }
                        else if (itemType === 'placeholder') {
                            return null; // TODO
                        }
                    }).toJS();
                }
            }


			let traits = block.get('traits');
			if (traits) {
				let blockElementWithTraits = reactElementForWrappingChildWithTraits(elements, traits, traitsSpecs);
				if (blockElementWithTraits) {
					elements = [
						blockElementWithTraits
					];
				}
				else {
					// For example, a 'hide' trait.
					elements = null;
				}
			}

			if (elements) {
				currentSubsectionElements = currentSubsectionElements.concat(
					reactElementsForSubsectionChild(
						currentSubsectionType, typeGroup, type, elements, traits, blockTypeOptions, blockIndex, subsectionsSpecs, ignoreOuter
					)
				);
			}
		}
	});

	processCurrentSubsectionChildren();

	return mainElements;
};

export const Content = createComponent({
	getDefaultProps() {
		return {
			propsFor: (path) => ({ className: path.join('__') }),
		};
	},

	render() {
		const { contentImmutable, specsImmutable, adjustBlock, renderBlock, propsFor } = this.props;

		if (!contentImmutable) {
			return createElement('div', null, '(No Content)');
		}

		let blocksImmutable = contentImmutable.get('blocks');

		let elements = reactElementsWithBlocks(blocksImmutable, specsImmutable, { adjustBlock, renderBlock });

		return createElement('div', {
			key: 'blocks',
			...propsFor(['blocks']),
		}, elements);
	}
});

function prettifyHTML(html) {
    const inlineTagNames = {
        'span': true,
        'strong': true,
        'em': true,
        'a': true,
        'img': true,
        'small': true,
    };

    const holdingTagNames = {
        'ul': true,
        'ol': true,
        'blockquote': true,
    };

    // Add new lines for presentation
    return html.replace(/<(\/?)([^>]+)>/gm, (match, optionalClosingSlash, tagName, offset, string) => {
        // Inline elements are kept as-is
        if (inlineTagNames[tagName]) {
            return match;
        }
        // Block elements are given line breaks for nicer presentation.
        else {
            if (optionalClosingSlash.length > 0) {
                return '<' + optionalClosingSlash + tagName + '>' + "\n";
                //return "\n" + '<' + optionalClosingSlash + tagName + '>' + "\n";
            }
            else {
                if (holdingTagNames[tagName]) {
                    return '<' + tagName + '>' + "\n";
                }
                else {
                    return '<' + tagName + '>';
                }
            }
        }
    });
}

export function previewHTMLWithContent(contentImmutable, specsImmutable, { pretty = true, adjustBlock, renderBlock } = {}) {
	const previewElement = createElement(Content, {
		key: 'main',
		contentImmutable,
		specsImmutable,
        adjustBlock,
        renderBlock,
	});

	let previewHTML = renderToStaticMarkup(previewElement);

	// Strip wrapping div.
	previewHTML = previewHTML.replace(/^<div class="blocks">|<\/div>$/gm, '');

	if (pretty) {
		previewHTML = prettifyHTML(previewHTML);
	}

	return previewHTML;
}
