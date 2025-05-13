/**
 * IndigoBook citation generator utility
 * This file provides functions for generating IndigoBook citations
 */

"use strict";

var IndigoBook = (function(){
  var { Zotero } = ChromeUtils.importESModule("chrome://zotero/content/zotero.mjs");
  Services.scriptloader.loadSubScript("chrome://zotero/content/legal_util/indigobook/rules.js", this);

  const ZoteroTypeToIndigoBookRule = {
    "journalArticle": IndigoBookRules.rule30,
    "conferencePaper": IndigoBookRules.rule30,
    "magazineArticle": IndigoBookRules.rule30,
    "newspaperArticle": IndigoBookRules.rule30,
    // Add more mappings as needed
  };

  return {
    getRule: function(itemTypeName) {
      const iBookRule = ZoteroTypeToIndigoBookRule[itemTypeName];
      if (iBookRule) {
        return iBookRule;
      }
      console.log("no iBook rule for:", Zotero.ItemTypes.getName(item.getType()));
      return null;
    },

    generateCitation: function(item) {
      console.log(item);
      const iBookRule = ZoteroTypeToIndigoBookRule[Zotero.ItemTypes.getName(item.getType())];
      if (iBookRule) {
        return iBookRule.generateCitation(item);
      }
      console.log(Zotero.ItemTypes.getName(item.getType()));
      return `TODO (${item.getField('title')})`;
    },

    generatePlaintextCitation: function(item) {
      const citation = this.generateCitation(item);
      const cleanedCitation = citation.replace(/<[^>]+>/g, ''); // Remove HTML tags
      return cleanedCitation
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
    }
  };
})();