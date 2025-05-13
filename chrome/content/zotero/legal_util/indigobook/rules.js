/**
 * IndigoBook citation generator utility
 * This file provides functions for generating IndigoBook citations
 */

"use strict";

var IndigoBookRules = (function (){
  Services.scriptloader.loadSubScript("chrome://zotero/content/legal_util/indigobook/tables.js", this);

  function _quick_escape(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return `${temp.innerHTML}`;
  }

  function _titleCase(str) {
    return str.toLowerCase().split(' ').map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  return {
    
    /**
    * Rule 30: Full Citation for Journals, Magazines & Newspaper Articles
    */
    rule30: {
      // 30.1 Journal Citation
      // Citations to consecutively paginated journals (that is, journals in which page numbering is continued from the last issue) take the following form:
      // <Author’s Name(s)>, <Designation of piece> <Italicized Title of the Article>, <volume number, if applicable> <Name of Publication, abbreviated> <page number of first page of article cited>, <pincite, if citing to specific point> <(year published)>.
      // Follow Rule R30.2 below for author name rules and Rule R30.3 for abbreviating the name of the publication.
      getFields: function(){
        return [
          'title',
          'publicationTitle',
          'proceedingsTitle',
          'volume',
          'pages',
          'year',
          'date',
          'url',
          'accessDate',
        ];
      },
      generateCitation: function(item) {
        let citation = '';

        const authors = IndigoBookRules.rule30.getAuthors(item);
        if (authors) {
          citation += `${_quick_escape(authors)}, `;
        }
        const designation = _titleCase(item.getField('type'));
        if (["Note", "Comment", "Book Report"].indexOf(designation) !== -1) {
          citation += `${_quick_escape(designation)}, `;
        }
        const articleTitle = item.getField('title');
        citation += `<i>${_quick_escape(articleTitle)}</i>, `;
        const journalTitle = item.getField('publicationTitle') || item.getField("proceedingsTitle");
        const journalName = IndigoBookRules.rule30.abbreviateJournalTitle(journalTitle);
        const volume = item.getField('volume');
        //page number of first page of article cited. E.g., 123-145 is "123"
        const firstPage = item.getField('pages').split('-')[0];
        if (journalName) {
          if (volume) {
            citation += `${_quick_escape(volume)} `;
          }
          citation += `<span style="font-variant: small-caps;">${_quick_escape(journalName)}</span> `;
          if (firstPage) {
            citation += `${_quick_escape(firstPage)} `;
          }
        }
        //year of publication
        const year = item.getField('year');
        if (year) {
          // Get current year
          const currentYear = new Date().getFullYear();
          const yearNumber = parseInt(year);
          
          // Check if year is a valid number and in the future
          if (!isNaN(yearNumber) && yearNumber > currentYear) {
            citation += `(forthcoming ${_quick_escape(year)})`;
          } else {
            citation += `(${_quick_escape(year)})`;
          }
        } else {
          citation += "(_)"
        }
        //url
        const url = item.getField('url').split("#")[0];
        if (url) {
          citation += `, ${_quick_escape(url)}`;
        }
        return citation.trim();
      },
      // 30.2 authors
      getAuthors: function(item) {
        const authors = item.getCreators();
        //R30.2.1 Name as listed - Show the author’s name beginning with first name, initials if indicated on the publication, and last name followed by any name suffixes (Jr., III) indicated on the publication title.
        const authorNames = authors.map(author => {
          const nameParts = [author.firstName, author.lastName];
          if (author.suffix) {
            nameParts.push(author.suffix);
          }
          return nameParts.join(' ');
        });
        if (authorNames.length === 1) {
          return authorNames[0];
        }
        //R30.2.2 Two authors - For two authors, indicate their names in the order shown on the publication, separated by an ampersand. Do not insert a comma before the ampersand.
        if (authors.length === 2) {
          return `${authorNames[0]} & ${authorNames[1]}`;
        }
        //R30.2.3 Multiple authors - For more than two authors, all authors may be listed with an ampersand before the last name; or all but the first may be omitted and replaced by “et al.” Indicate all authors when relevant the point being made, or when recognition of all authors is desirable.
        // STEIN MODIFICATION: if set, include the first {indigoBook.maxAuthors} authors.
        const maxAuthors = Zotero.Prefs.get('indigoBook.maxAuthors');
        if (maxAuthors && maxAuthors > 0 && authors.length > maxAuthors) {
          return `${authorNames.slice(0, maxAuthors).join(', ')}, et al.`;
        } else if (maxAuthors){
          return authorNames.join(', ');
        } else {
          return `${authorNames[0]} et al.`;  
        }

        //R30.2.4 No Author Listed - When no author is listed at the beginning or end of the publication source, skip the author field and begin the citation with the publication’s title.
        if (authors.length === 0) {
          return undefined;
        }
      },
      // 30.3 Journal Titles
      abbreviateJournalTitle: function(journalTitle) {
        //Use the abbreviations for common institutional names as listed in Table T15 if the name is listed. If the institutional name is not listed in Table T15, use abbreviations as listed in Table T11 and Table T12. If the periodical title has an abbreviation in it, use the abbreviation. If the word is not found in any of these tables, do not abbreviate the word in the abbreviated title.
        const table11 = IndigoBookTables.table11;
        const table12 = IndigoBookTables.table12;
        const table15 = IndigoBookTables.table15;
        if (table15[journalTitle]) {
          return table15[journalTitle];
        }
        let abbreviatedTitle = journalTitle;
        for (const table of [table15, table11, table12]) {
          for (const [key, value] of Object.entries(table)) {
            abbreviatedTitle = abbreviatedTitle.replace(new RegExp(`\\b${key}\\b`, 'gi'), value);        
          }
        }
        // tables 
        // For journals not listed in the tables, streamline the journal title with these grammar mechanics:
        //Do not use the words “a,” “at,” “in,” “of,” and “the” in the abbreviated title. Do, however, use the word “on.”
        abbreviatedTitle = abbreviatedTitle.replace(/\b(a|at|in|of|the)\b/gi, '');
        // If the title consists of “a,” “at,” “in,” “of,” or “the” followed by a single word, do not abbreviate the remaining word.
        // For example, “The Journal” becomes “Journal”
        if (journalTitle.match(/^(a|at|in|of|the)\s+\w+$/i)) {
          abbreviatedTitle = journalTitle.replace(/^(a|at|in|of|the)\s+/i, '');
        }
        //Omit all commas in abbreviated titles, but retain other punctuation. 
        abbreviatedTitle = abbreviatedTitle.replace(/,/g, '');
        //If a periodical title has a colon followed by words, omit all that from the abbreviated title. 
        abbreviatedTitle = abbreviatedTitle.replace(/:\s*.*$/, '');
        return abbreviatedTitle;      
      },
      
    },

    /**
     * Rule 33: Basic Formula for Internet Sources
     * Citations to Internet sources follow this form: <Author Name>, <Title of Website Page>, <italicized Main Website Title>, <pincite> <(Date source posted, with exact time of posting if available)>, <URL>.
     */     
    rule33: {
      formatDate: function(date) {
      	const monthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
        const zdate = Zotero.Date.strToDate(date);
        let dateString = '';
        if (zdate.month) {
          dateString += `${monthNames[zdate.month]} `;
          if (zdate.day) {
            dateString += `${zdate.day}, `;
          }
        }
        if (zdate.year) {
          dateString += `${zdate.year}`;
        }
      },
      generateCitation: function(item) {
        const publicationTitle = item.getField('publicationTitle') || item.getField('websiteTitle') || item.getField('blogTitle');
        const publicationName = rule30.abbreviateJournalTitle(publicationTitle);
        const title = item.getField('title');
        const authors = IndigoBookRules.rule30.getAuthors(item);
        const date = item.getField('date');
        const dateString = IndigoBookRules.rule33.formatDate(date);
        const url = item.getField('url').split("#")[0];
        const dateAccessed = item.getField('accessDate');
        const dateAccessedString = IndigoBookRules.rule33.formatDate(dateAccessed);
        let citation = '';
        if (authors) {
          citation += `${_quick_escape(authors)}, `;
        }
        if (title) {
          citation += `<i>${_quick_escape(title)}</i>, `;
        }
        if (publicationName) {
          citation += `${_quick_escape(publicationName)}, `;
        }
        if (dateString) {
          citation += `(${_quick_escape(dateString)})`;
        }
        if (url) {
          citation += `, ${_quick_escape(url)}`;
        }
        if (dateAccessedString) {
          citation += ` (last visited ${_quick_escape(dateAccessedString)})`;
        }
      }
    }
  };
})();