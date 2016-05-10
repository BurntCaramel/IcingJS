/**
	Copyright 2015 Patrick George Wyndham Smith
*/

import React from 'react';
import Immutable from 'immutable';

function checkOptionsShouldShow(options, sourceValue) {
	if (options.has('checkIsPresent')) {
		let checkIsPresentInfo = options.get('checkIsPresent');
		let valueToCheck = getAttributeValueForInfoAndSourceValue(checkIsPresentInfo, sourceValue);
		if (valueToCheck === null || valueToCheck === false) {
			return false;
		}
	}

	if (options.has('checkIsFilled')) {
		let checkIsFilledInfo = options.get('checkIsFilled');
		let valueToCheck = getAttributeValueForInfoAndSourceValue(checkIsFilledInfo, sourceValue);
		if (typeof valueToCheck !== 'string' || valueToCheck.trim() === '') {
			return false;
		}
	}

	return true;
}

function getAttributeValueForInfoAndSourceValue(attributeValueRepresentation, sourceValue) {
	if (typeof attributeValueRepresentation === 'string') {
		return attributeValueRepresentation;
	}
	else if (Immutable.List.isList(attributeValueRepresentation)) {
		let keyPath = attributeValueRepresentation;
		return sourceValue.getIn(keyPath);
	}
	else if (Immutable.Map.isMap(attributeValueRepresentation)) {
		let attributeOptions = attributeValueRepresentation;

		if (!checkOptionsShouldShow(attributeOptions, sourceValue)) {
			return null;
		}

		if (attributeOptions.has('text')) {
			return getAttributeValueForInfoAndSourceValue(attributeOptions.get('text'), sourceValue);
		}
		else if (attributeOptions.has('join')) {
			let join = attributeOptions.get('join');
			let pieces = [];
			let allPresent = join.every((attributeInfoToCheck) => {
				let valueToCheck = getAttributeValueForInfoAndSourceValue(attributeInfoToCheck, sourceValue);
				if (valueToCheck == null) {
					return false;
				}

				pieces.push(valueToCheck);
				return true;
			});

			if (allPresent) {
				return pieces.join('');
			}
		}
		else if (attributeOptions.has('firstWhichIsPresent')) {
			let firstWhichIsPresent = attributeOptions.get('firstWhichIsPresent');

			/*return Immutable.Seq(firstWhichIsPresent) // Make lazy
				.map(attributeInfoToCheck => getAttributeValueForInfoAndSourceValue(attributeInfoToCheck, sourceValue))
				.find(value => !!value); */

			let attributeValue;

			firstWhichIsPresent.forEach((attributeInfoToCheck) => {
				let valueToCheck = getAttributeValueForInfoAndSourceValue(attributeInfoToCheck, sourceValue);
				if (valueToCheck != null) {
					attributeValue = valueToCheck;
					return false; // break
				}
			});

			return attributeValue;
		}
		/*else if (attributeOptions.has('every')) {

		}
		else if (attributeOptions.has('any')) {

		}
		*/
	}
};

export function isValidHTMLRepresentationType(potentialHTMLRepresentation) {
	return Immutable.List.isList(potentialHTMLRepresentation);
};

export function createReactElementsForHTMLRepresentationAndValue(
	HTMLRepresentation, sourceValue, uniqueIdentifier = 'child'
) {
	const reactElementForElementOptions = (elementOptions, index, indexPath) => {
		if (!checkOptionsShouldShow(elementOptions, sourceValue)) {
			return null;
		}

		indexPath = indexPath.concat(index);
		let indexPathString = indexPath.join('/')
		let key = `child-${ indexPath.join() }`

		// Referenced Element
		if (elementOptions.get('placeOriginalElement', false)) {
			return sourceValue.get('originalElement', null);
		}
		// Element
		else if (elementOptions.has('tagName')) {
			let tagName = elementOptions.get('tagName');

			let attributes = elementOptions.get('attributes');
			let attributesReady = {};
			if (attributes && sourceValue) {
				attributesReady = attributes.map(function(attributeValueRepresentation, attributeName) {
					return getAttributeValueForInfoAndSourceValue(attributeValueRepresentation, sourceValue);
				}).toJS();
			}

			attributesReady.key = key;

			let children = elementOptions.get('children');
			let childrenReady = null;
			if (children) {
				childrenReady = children.map((elementOptions, index) =>
					reactElementForElementOptions(elementOptions, index, indexPath)
				).toJS();
			}

			return React.createElement(tagName, attributesReady, childrenReady);
		}
		// Unsafe HTML
		else if (elementOptions.has('unsafeHTML')) {
			let unsafeHTML = getAttributeValueForInfoAndSourceValue(elementOptions.get('unsafeHTML'), sourceValue);
			if (!unsafeHTML) {
				unsafeHTML = '';
			}
			let unsafeHTMLForReact = {__html: unsafeHTML};

			return React.createElement('div', {
				key,
				dangerouslySetInnerHTML: unsafeHTMLForReact
			});
		}
		// Experimental: lineBreak
		else if (elementOptions.get('lineBreak', false)) {
			return React.createElement('br', { key });
		}
		// Text
		else {
			return getAttributeValueForInfoAndSourceValue(elementOptions, sourceValue);
		}
	};

	const indexPath = [uniqueIdentifier];
	return HTMLRepresentation.map((elementOptions, index) =>
		reactElementForElementOptions(elementOptions, index, indexPath)
	).toJS();
};
