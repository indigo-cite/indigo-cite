
{
	const waitFrame = async () => {
		return waitNoLongerThan(new Promise((resolve) => {
			requestAnimationFrame(resolve);
		}), 30);
	};
	
	const waitFrames = async (n) => {
		for (let i = 0; i < n; i++) {
			await waitFrame();
		}
	};

	const waitDOMUpdate = async (timeout = 50) => {
		return new Promise((resolve) => {
			requestIdleCallback(resolve, { timeout });
		});
	};

	const waitNoLongerThan = async (promise, ms = 1000) => {
		return Promise.race([
			promise,
			Zotero.Promise.delay(ms)
		]);
	};
  
	class MultiInfoBox extends XULElementBase {
		_handleKeydown = (event) => {
			// Handle keyboard events
		};
		
		_handleContainerScroll = () => {
			if (this._disableScrollHandler) return;
			this._lastScrollTop = this._paneParent.scrollTop;
		};
		
		_handlePaneStatus = () => {
			// Handle pane status changes
		};
		content = MozXULElement.parseXULToFragment(`
      <hbox id="zotero-view-item-container" class="zotero-view-multi-item-container" flex="1">
        <html:div class="zotero-view-item-main">

					<html:div id="zotero-view-multi-item" class="zotero-view-item">
            <html:div id="zotero-view-multi-item-citation">
            </html:div>
            <html:div id="zotero-view-multi-item-bulk-editor">
            </html:div>
          </html:div>
        </html:div>
      </hbox>
    `);

		get items() {
			return this._items;
		}

		set items(items) {
			this._items = items;
		}

		/*
		 * For contextPane update
		 */
		get parentID() {
			return this._cachedParentID;
		}

		set parentID(parentID) {
			this._cachedParentID = parentID;
		}

		get editable() {
			return this._editable;
		}

		set editable(editable) {
			this._editable = editable;
			this.toggleAttribute('readonly', !editable);
		}

		get tabID() {
			return this._tabID;
		}
	
		set tabID(tabID) {
			this._tabID = tabID;
		}

		get tabType() {
			return this.getAttribute('tabType');
		}

		set tabType(tabType) {
			this.setAttribute('tabType', tabType);
		}

		get _minScrollHeight() {
			return parseFloat(this._paneParent.style.getPropertyValue('--min-scroll-height') || 0);
		}
		
		set _minScrollHeight(val) {
			this._paneParent.style.setProperty('--min-scroll-height', val + 'px');
		}

		get _collapsed() {
			let collapsible = this.closest('splitter:not([hidden="true"]) + *');
			if (!collapsible) return false;
			return collapsible.getAttribute('collapsed') === 'true';
		}
		
		set _collapsed(val) {
			let collapsible = this.closest('splitter:not([hidden="true"]) + *');
			if (!collapsible) return;
			let splitter = collapsible.previousElementSibling;
			if (val) {
				collapsible.setAttribute('collapsed', 'true');
				collapsible.removeAttribute("width");
				collapsible.removeAttribute("height");
				splitter.setAttribute('state', 'collapsed');
				splitter.setAttribute('substate', 'after');
			}
			else {
				collapsible.removeAttribute('collapsed');
				splitter.setAttribute('state', '');
				splitter.setAttribute('substate', 'after');
			}
			window.dispatchEvent(new Event('resize'));
		}

		get sidenav() {
			return this._sidenav;
		}

		set sidenav(sidenav) {
			this._sidenav = sidenav;
			sidenav.container = this;
			// Manually update once and further changes will be synced automatically to sidenav
			this.forceUpdateSideNav();
		}
		
		// Methods for intersection observer
		_initIntersectionObserver() {
			if (this._intersectionOb) {
				this._intersectionOb.disconnect();
			}
			this._intersectionOb = new IntersectionObserver(this._handleIntersection);
			this._toggleIntersectionObserver(true);
		}
		
		_toggleIntersectionObserver(enabled) {
			// For the multi-item box, we only observe the container element
			if (enabled) {
				this._intersectionOb.observe(this._paneParent);
			} else {
				this._intersectionOb.unobserve(this._paneParent);
			}
		}
		
		_handleIntersection = async (entries) => {
			if (this._isRendering) return;
			
			for (const entry of entries) {
				if (entry.isIntersecting) {
					// Re-render when it becomes visible
					if (this._pendingRender) {
						this._pendingRender = false;
						await this.render();
					}
				}
			}
		}
		
		forceUpdateSideNav() {
			// No sidenav interactions needed for multi-item view
		}
		
		getPanes() {
			// Unlike ItemDetails, we don't have multiple panes to manage
			return [];
		}
		
		_restorePinnedPane() {
			// No pinned panes in multi-item view
		}

		get skipRender() {
			return this._skipRender;
		}

		set skipRender(val) {
			this._skipRender = val;
			let panes = this.getPanes();
			for (let pane of [this._header, ...panes]) {
				pane.skipRender = val;
			}
		}

		static get observedAttributes() {
			return ['pinnedPane'];
		}

		init() {
			this._container = this.querySelector('#zotero-view-multi-item-container');
			this._paneParent = this.querySelector('#zotero-view-multi-item');
      this._citationContainer = this.querySelector('#zotero-view-multi-item-citation');
      this._bulkEditorContainer = this.querySelector('#zotero-view-multi-item-bulk-editor');

			this._container.addEventListener("keydown", this._handleKeydown);
			this._paneParent.addEventListener('scroll', this._handleContainerScroll);

			this._paneHiddenOb = new MutationObserver(this._handlePaneStatus);
			this._paneHiddenOb.observe(this._paneParent, {
				attributes: true,
				attributeFilter: ["hidden"],
				subtree: true,
			});
			this._initIntersectionObserver();

			this._notifierID = Zotero.Notifier.registerObserver(
				this, ['item', 'itempane', 'tab'], 'ItemDetails');
			this._prefsObserverID = Zotero.Prefs.registerObserver('pinnedPane', this._restorePinnedPane.bind(this));

			this._disableScrollHandler = false;
			this._pinnedPaneMinScrollHeight = 0;

			this._lastUpdateCustomSection = "";

			this._lastScrollTop = 0;

			// If true, will render on tab select
			this._pendingRender = false;
			// If true, will skip render
			this._skipRender = false;
		}

		destroy() {
			this._container.removeEventListener("keydown", this._handleKeydown);
			this._paneParent.removeEventListener('scroll', this._handleContainerScroll);

			this._paneHiddenOb.disconnect();
			this._intersectionOb.disconnect();

			Zotero.Notifier.unregisterObserver(this._notifierID);
			Zotero.Prefs.unregisterObserver(this._prefsObserverID);
		}

		async render() {
			if (!this.initialized || !this.items) {
				return;
			}

			if (this.skipRender) {
				this._pendingRender = true;
				return;
			}
			this._pendingRender = false;

			let items = this.items;
			this._isRendering = true;

      // Render citations container
      this._renderCitationsContainer();
      
      // Render bulk editor container
      this._renderBulkEditorContainer();
      
      this._isRendering = false;

			if (Zotero.test) {
				resolve();
			}
		}
    
    /**
     * Renders the citations container with all selected items' IndigoBook citations
     */
    _renderCitationsContainer() {
      if (!this.items || !this.items.length) return;
      
      this._citationContainer.innerHTML = '';
      
      // Create header
      const header = document.createElement('h3');
      header.textContent = `${this.items.length} items selected`;
      this._citationContainer.appendChild(header);
      
      // Create citation container
      const newCitation = document.createElement('div');
      newCitation.className = 'indigo-citations-container';
      
      // Add each citation
      for (let item of this.items) {
        const citation = Zotero.IndigoBook.generateCitation(item);
        newCitation.innerHTML += `${citation}; `;
      }
      
      this._citationContainer.appendChild(newCitation);
      
      // Add copy button
      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy';
      copyButton.className = 'zotero-button';
      copyButton.addEventListener('click', () => {
        Zotero.Utilities.Internal.copyFormattedCitation(newCitation);
      });
      
      this._citationContainer.appendChild(copyButton);
    }
    
    /**
     * Renders the bulk editor container with tag management and item operations
     */
    _renderBulkEditorContainer() {
      if (!this.items || !this.items.length) return;
      
      this._bulkEditorContainer.innerHTML = '';
      
      // Create sections container
      const sectionsContainer = document.createElement('div');
      sectionsContainer.className = 'bulk-edit-sections';
      this._bulkEditorContainer.appendChild(sectionsContainer);
      
      // Add tag management section
      this._renderTagManagementSection(sectionsContainer);
      
      // Add item type change section if editable
      if (this.editable) {
        this._renderItemTypeSection(sectionsContainer);
      }
      
      // Add text operations section if editable
      if (this.editable) {
        this._renderTextOperationsSection(sectionsContainer);
      }
    }
    
    /**
     * Renders the tag management section
     * @param {HTMLElement} container - The container to add the section to
     */
    _renderTagManagementSection(container) {
      const section = document.createElement('div');
      section.className = 'bulk-edit-section tags-section';
      
      // Section header
      const header = document.createElement('h4');
      header.textContent = 'Tags';
      section.appendChild(header);
      
      // Tag input container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'tag-input-container';
      
      // Tag input
      const tagInput = document.createElement('input');
      tagInput.type = 'text';
      tagInput.placeholder = 'Enter tag name';
      tagInput.className = 'tag-input';
      inputContainer.appendChild(tagInput);
      
      // Buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'tag-buttons';
      
      // Add tag button
      const addButton = document.createElement('button');
      addButton.textContent = 'Add Tag';
      addButton.className = 'zotero-button primary';
      addButton.disabled = !this.editable;
      addButton.addEventListener('click', () => {
        const tagName = tagInput.value.trim();
        if (tagName) {
          this._addTagToItems(tagName);
          tagInput.value = '';
        }
      });
      buttonsContainer.appendChild(addButton);
      
      // Remove tag button
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove Tag';
      removeButton.className = 'zotero-button';
      removeButton.disabled = !this.editable;
      removeButton.addEventListener('click', () => {
        const tagName = tagInput.value.trim();
        if (tagName) {
          this._removeTagFromItems(tagName);
          tagInput.value = '';
        }
      });
      buttonsContainer.appendChild(removeButton);
      
      inputContainer.appendChild(buttonsContainer);
      section.appendChild(inputContainer);
      
      // Common tags list (show tags that exist on at least one item)
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'common-tags-container';
      
      const tagsLabel = document.createElement('span');
      tagsLabel.className = 'common-tags-label';
      tagsLabel.textContent = 'Common tags: ';
      tagsContainer.appendChild(tagsLabel);
      
      const tagsList = document.createElement('div');
      tagsList.className = 'common-tags-list';
      
      // Get common tags
      const allTags = new Map();
      for (const item of this.items) {
        const itemTags = item.getTags();
        for (const tag of itemTags) {
          const tagName = tag.tag;
          if (allTags.has(tagName)) {
            allTags.set(tagName, allTags.get(tagName) + 1);
          } else {
            allTags.set(tagName, 1);
          }
        }
      }
      
      // Add tag chips with delete buttons
      for (const [tagName, count] of allTags.entries()) {
        const tagChip = document.createElement('div');
        tagChip.className = 'tag-chip';
        
        // Tag name and count
        const tagText = document.createElement('span');
        tagText.className = 'tag-text';
        tagText.textContent = `${tagName} (${count})`;
        tagChip.appendChild(tagText);
        
        // Add delete button (x)
        const deleteButton = document.createElement('span');
        deleteButton.className = 'tag-delete-button';
        deleteButton.textContent = '×';
        
        // Add click handler for tag text to fill the input
        tagText.addEventListener('click', () => {
          tagInput.value = tagName;
        });
        
        // Add click handler for delete button to remove tag
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation(); // Don't trigger the tagChip click event
          
          if (this.editable) {
            this._removeTagFromItems(tagName);
          } else {
            // If not editable, at least put the tag in the input
            tagInput.value = tagName;
          }
        });
        
        // Add readonly class if not editable
        if (!this.editable) {
          deleteButton.classList.add('readonly');
          deleteButton.title = 'You do not have permission to remove tags';
        }
        
        tagChip.appendChild(deleteButton);
        tagsList.appendChild(tagChip);
      }
      
      tagsContainer.appendChild(tagsList);
      section.appendChild(tagsContainer);
      
      container.appendChild(section);
    }
    
    /**
     * Renders the item type change section
     * @param {HTMLElement} container - The container to add the section to
     */
    _renderItemTypeSection(container) {
      const section = document.createElement('div');
      section.className = 'bulk-edit-section item-type-section';
      
      // Item types of selected items
      const itemTypes = new Set(this.items.map(item => item.itemTypeID));
      const hasMultipleTypes = itemTypes.size > 1;
      
      // Item type selector
      const selectContainer = document.createElement('div');
      selectContainer.className = 'item-type-select-container';
      
      // Add a note if items have different types
      if (hasMultipleTypes) {
        const noteText = document.createElement('p');
        noteText.className = 'item-type-note';
        noteText.textContent = 'Selected items have different types. Changing type will affect all selected items.';
        section.appendChild(noteText);
      }
      
      const selectLabel = document.createElement('span');
      selectLabel.textContent = 'New item type: ';
      selectContainer.appendChild(selectLabel);
      
      const select = document.createElement('select');
      select.className = 'item-type-select';
      
      // Add all Zotero item types
      const itemTypesList = Zotero.ItemTypes.getTypes();
      
      // Sort item types alphabetically
      itemTypesList.sort((a, b) => a.name.localeCompare(b.name));
      
      for (const itemType of itemTypesList) {
        // Include all types, not just primary ones
        const option = document.createElement('option');
        option.value = itemType.id;
        option.textContent = itemType.name;
        
        // If items all have the same type, select that type
        if (itemTypes.size === 1 && this.items[0].itemTypeID === itemType.id) {
          option.selected = true;
        }
        select.appendChild(option);
      }
      
      selectContainer.appendChild(select);
      
      // Change button
      const changeButton = document.createElement('button');
      changeButton.textContent = 'Change';
      changeButton.className = 'zotero-button';
      changeButton.disabled = !this.editable;
      
      if (!this.editable) {
        changeButton.title = 'You do not have permission to change item types';
      }
      
      changeButton.addEventListener('click', () => {
        if (this.editable) {
          const newTypeID = parseInt(select.value);
          this._changeItemType(newTypeID);
        }
      });
      
      selectContainer.appendChild(changeButton);
      section.appendChild(selectContainer);
      
      container.appendChild(section);
    }
    
    /**
     * Renders the text operations section for transforming title cases
     * @param {HTMLElement} container - The container to add the section to
     */
    _renderTextOperationsSection(container) {
      const section = document.createElement('div');
      section.className = 'bulk-edit-section text-operations-section';
      
      // Operations container
      const operationsContainer = document.createElement('div');
      operationsContainer.className = 'text-operations-container';
      
      // Title case operation
      const titleCaseContainer = document.createElement('div');
      titleCaseContainer.className = 'operation-container';
            
      const titleCaseButton = document.createElement('button');
      titleCaseButton.textContent = 'Convert ALL CAPS titles to Title Case';
      titleCaseButton.className = 'zotero-button';
      titleCaseButton.addEventListener('click', () => {
        this._convertTitlesToTitleCase();
      });
      
      titleCaseContainer.appendChild(titleCaseButton);
      operationsContainer.appendChild(titleCaseContainer);
      
      section.appendChild(operationsContainer);
      container.appendChild(section);
    }
    
    /**
     * Adds a tag to all selected items
     * @param {string} tagName - The name of the tag to add
     */
    async _addTagToItems(tagName) {
      if (!this.items || !this.items.length || !this.editable) return;
      
      await Zotero.DB.executeTransaction(async () => {
        for (const item of this.items) {
          item.addTag(tagName);
          await item.save();
        }
      });
      
      // Refresh the view
      this._renderBulkEditorContainer();
    }
    
    /**
     * Removes a tag from all selected items
     * @param {string} tagName - The name of the tag to remove
     */
    async _removeTagFromItems(tagName) {
      if (!this.items || !this.items.length || !this.editable) return;
      
      await Zotero.DB.executeTransaction(async () => {
        for (const item of this.items) {
          item.removeTag(tagName);
          await item.save();
        }
      });
      
      // Refresh the view
      this._renderBulkEditorContainer();
    }
    
    /**
     * Changes the item type of all selected items
     * @param {number} newTypeID - The ID of the new item type
     */
    async _changeItemType(newTypeID) {
      if (!this.items || !this.items.length || !this.editable) return;
      
      await Zotero.DB.executeTransaction(async () => {
        for (const item of this.items) {
          item.setType(newTypeID);
          await item.save();
        }
      });
      
      // Refresh the view
      this._renderBulkEditorContainer();
    }
    
    /**
     * Converts titles of all selected items from ALL CAPS to title case
     */
    async _convertTitlesToTitleCase() {
      if (!this.items || !this.items.length || !this.editable) return;
      
      await Zotero.DB.executeTransaction(async () => {
        for (const item of this.items) {
          const title = item.getField('title');
          // Only convert if the title is ALL CAPS
          if (title && this._isAllCaps(title)) {
            // Use our own title case implementation
            const newTitle = this._toTitleCase(title);
            item.setField('title', newTitle);
            await item.save();
          }
        }
      });
    }
    
    /**
     * Checks if a string is in ALL CAPS
     * @param {string} text - The text to check
     * @returns {boolean} True if the string is ALL CAPS, false otherwise
     */
    _isAllCaps(text) {
      // Check if the text has letters and if all letters are uppercase
      return /[A-Z]/.test(text) && !/[a-z]/.test(text);
    }
    
    /**
     * Converts a string to title case
     * @param {string} text - The text to convert
     * @returns {string} The text in title case
     */
    _toTitleCase(text) {
      if (!text) return text;
      
      // List of small words that should be lowercase unless they are the first or last word
      const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v\.?|vs\.?|via)$/i;
      
      return text.toLowerCase()
        .split(/\s+/)
        .map((word, index, array) => {
          // If it's the first or last word, always capitalize first letter
          if (index === 0 || index === array.length - 1) {
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
          
          // If it's a small word, don't capitalize
          if (smallWords.test(word)) {
            return word;
          }
          
          // Otherwise capitalize first letter
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    }
    
    /**
     * Converts titles of all selected items to lowercase
     */
    async _convertTitlesToLowercase() {
      if (!this.items || !this.items.length || !this.editable) return;
      
      await Zotero.DB.executeTransaction(async () => {
        for (const item of this.items) {
          const title = item.getField('title');
          if (title) {
            const newTitle = title.toLowerCase();
            item.setField('title', newTitle);
            await item.save();
          }
        }
      });
    }
	}
	customElements.define("multi-info-box", MultiInfoBox);
}
