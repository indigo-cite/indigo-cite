/**
 * IndigoBook citation generator utility
 * This file provides functions for generating IndigoBook citations
 */

"use strict";
var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");

Services.scriptloader.loadSubScript("chrome://zotero/content/legal_util/indigobook/rules.js", window);

var Zotero_IndigoBook = {
	/**
	 * Generate an IndigoBook citation for the given item
	 * 
	 * @param {Zotero.Item} item - The Zotero item to generate a citation for
	 * @return {string} The IndigoBook citation as a string
	 */
	generateCitation: function(item) {
    console.log(item);
    // rule 30:  Full Citation for Journals, Magazines & Newspaper Articles
    const rule30Types = [
      'journalArticle',
      'conferencePaper',
      'magazineArticle',
      'newspaperArticle',
    ];
    if (rule30Types.indexOf(Zotero.ItemTypes.getName(item.getType()) ) !== -1) {
      return IndigoBookRules.rule30.generateCitation(item);
    }
    if (Zotero.ItemTypes.getName(item.getType()) === 'conferencePaper') {
      return IndigoBookRules.rule30.generateCitation(item);
    }
    console.log(Zotero.ItemTypes.getName(item.getType()));
		return `TODO (${item.getField('title')})`;
	}
};