/**
 * IndigoBook citation generator utility
 * This file provides functions for generating IndigoBook citations
 */

"use strict";
var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");

Services.scriptloader.loadSubScript("chrome://zotero/content/legal_util/indigobook/rules.js", window);

var ZoteroTypeToIndigoBookRule = {
  "journalArticle": IndigoBookRules.rule30,
  "conferencePaper": IndigoBookRules.rule30,
  "magazineArticle": IndigoBookRules.rule30,
  "newspaperArticle": IndigoBookRules.rule30,
  // Add more mappings as needed
};

var IndigoBook = {
	/**
	 * Generate an IndigoBook citation for the given item
	 * 
	 * @param {Zotero.Item} item - The Zotero item to generate a citation for
	 * @return {string} The IndigoBook citation as a string
	 */
	generateCitation: function(item) {
    console.log(item);
    const iBookRule = ZoteroTypeToIndigoBookRule[Zotero.ItemTypes.getName(item.getType())];
    if (iBookRule) {
      return iBookRule.generateCitation(item);
    }
    console.log(Zotero.ItemTypes.getName(item.getType()));
		return `TODO (${item.getField('title')})`;
	}
};