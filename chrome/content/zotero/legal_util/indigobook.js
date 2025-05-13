/**
 * IndigoBook citation generator utility
 * This file provides functions for generating IndigoBook citations
 */

"use strict";

// Export for usage in Zotero object
var IndigoBook = (function(){
  // Services.scriptloader.loadSubScript("chrome://zotero/content/legal_util/indigobook/rules.js", this);
  const rules = Zotero.IndigoBookRules;
  const ZoteroTypeToIndigoBookRule = {
    "journalArticle": rules.rule30,
    "conferencePaper": rules.rule30,
    "magazineArticle": rules.rule30,
    "newspaperArticle": rules.rule30,
    // Add more mappings as needed
  };

  return {
    getRule: function(itemTypeName) {
      const iBookRule = ZoteroTypeToIndigoBookRule[itemTypeName];
      if (iBookRule) {
        return iBookRule;
      }
      console.log("no iBook rule for:", itemTypeName);
      return null;
    },

    generateCitation: function(item) {
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
