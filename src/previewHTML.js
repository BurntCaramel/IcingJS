import React, { PropTypes } from 'react';

import { previewHTMLWithContent } from './presentation';

const HTMLPreviewCode = React.createClass({
	componentDidMount() {
		// Syntax highlighting
		if (window.hljs) {
			window.hljs.highlightBlock(this.refs.code);
		}
	},

	render() {
		const {
			previewHTML
		} = this.props;

		return React.createElement('code', {
			className: 'language-html',
			ref: 'code'
		}, previewHTML);
	}
});

/*export const ContentHTMLPreview = React.createClass({
	render() {
		var {
			documentID,
			sectionID,
			content,
			specs,
			actions
		} = this.props
		var previewHTML = previewHTMLWithContent(content, specs);
		return React.createElement('pre', { className: 'previewHTMLHolder' }
			React.createElement(HTMLPreviewCode, { previewHTML: previewHTML })
		);
	}
});*/

export function ContentHTMLPreview({
	documentID,
	sectionID,
	content,
	specs,
	actions
}) {
	const previewHTML = previewHTMLWithContent(content, specs);

	return (
		<pre className='previewHTMLHolder'>
			<HTMLPreviewCode previewHTML={ previewHTML } />
		</pre>
	);
};
