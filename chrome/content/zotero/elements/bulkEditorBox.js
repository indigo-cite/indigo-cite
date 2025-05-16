
{
  const InfoBox = customElements.get("info-box");
	class BulkEditorBox extends InfoBox {
		constructor() {
			super();
			this._items = [];
		}
	
		get content() {
			return MozXULElement.parseXULToFragment(`
        <html:div class="body">
          <div id="info-box" xmlns="http://www.w3.org/1999/xhtml">
            <div id="zotero-bulk-editor-container">
            </div>
          </div>
        </html:div>
			`);
		}
		
		get items() {
			return this._items;
		}
		
		set items(items) {
			this._items = items;
			// If already initialized, re-render
			if (this.initialized) {
				this.render();
			}
		}
		
    get _container() {
      if (!this.__container) {
        this.__container = this.querySelector('#zotero-bulk-editor-container');
      }
      return this.__container;
    }

		init() {
			super.init();
		}
		
		destroy() {
			super.destroy();
		}
		
		render() {
			if (!this.initialized || !this.items || !this.items.length) {
				return;
			}
			
			this._renderBulkEditorContainer();
		}
		
		/**
		 * Renders the bulk editor container with common fields and editing sections
		 */
		_renderBulkEditorContainer() {
			if (!this.items || !this.items.length) return;
			
			this._container.innerHTML = '';
			const sectionsContainer = document.createElement('div');
			sectionsContainer.className = 'bulk-edit-sections';
			this._container.appendChild(sectionsContainer);
			
			this._renderCommonFieldsSection(sectionsContainer);
			
			// Add tag management section
			this._renderTagManagementSection(sectionsContainer);
			
			// Add text operations section if editable
			if (this.editable) {
				this._renderTextOperationsSection(sectionsContainer);
			}
		}
		
		/**
		 * Renders a section showing common fields (item type, title, publication, date)
		 * @param {HTMLElement} container - The container to add the section to
		 */
		_renderCommonFieldsSection(container) {
			const section = document.createElement('div');
			section.className = 'bulk-edit-section common-fields-section';
			const header = document.createElement('h4');
			header.textContent = 'Common Fields';
			section.appendChild(header);
			
			// Add note about multiple values if items have different types
			const itemTypes = new Set(this.items.map(item => item.itemTypeID));
			if (itemTypes.size > 1) {
				const noteText = document.createElement('p');
				noteText.className = 'common-fields-note';
				noteText.textContent = 'Selected items have different types. Changing type will affect all selected items.';
				noteText.style.fontSize = '0.9em';
				noteText.style.color = '#666';
				noteText.style.marginBottom = '10px';
				section.appendChild(noteText);
			}
			
			const infoTable = document.createElement('div');
			infoTable.id = 'info-table';
			
			// Check for common values across items
			const commonValues = this._getCommonFieldValues();
			
			// Create rows for each field
			const fieldsToShow = [
				{ name: 'itemType', label: 'Item Type', zoteroField: 'itemType' },
				{ name: 'title', label: 'Title', zoteroField: 'title' },
				{ name: 'publication', label: 'Publication', zoteroField: 'publicationTitle' },
				{ name: 'date', label: 'Date', zoteroField: 'date' }
			];
			
			for (const field of fieldsToShow) {
				// If the field is not applicable to any item type, skip it
				if (field.name === 'publication' && !this._isFieldApplicableToAnyItem('publication')) {
					continue;
				}
				
				// Create meta-row like in itemBox
				const row = document.createElement('div');
				row.className = 'meta-row';
				
				// Label wrapper
				const labelWrapper = document.createElement('div');
				labelWrapper.className = 'meta-label';
				labelWrapper.setAttribute('fieldname', field.zoteroField);
				
				let labelElement = this.createLabelElement({
					text: field.label,
					id: `multi-itembox-field-${field.name}-label`
				});
				labelWrapper.appendChild(labelElement);
				
				// Data wrapper
				const dataWrapper = document.createElement('div');
				dataWrapper.className = 'meta-data';
				
				if (commonValues[field.name]) {
					// If there's a common value, show an editable field
					if (field.name === 'itemType') {
						// For item type, create a menulist similar to itemBox
						const menulist = document.createXULElement("menulist", { is: "menulist-item-types" });
						menulist.id = "item-type-menu";
						menulist.className = "zotero-clicky keyboard-clickable";
						menulist.setAttribute("tabindex", 0);
						menulist.setAttribute("aria-labelledby", labelElement.id);
						
						// Set the value to the current item type once it's populated
						const currentItemType = commonValues[field.name];
						const currentItemTypeID = Zotero.ItemTypes.getID(currentItemType);
						
						if (!this.editable) {
							menulist.setAttribute("disabled", true);
						} else {
							menulist.addEventListener('command', (event) => {
								const newTypeID = parseInt(event.target.value);
								this._changeItemType(newTypeID);
							});
						}
						
						// Add to DOM immediately so the menulist can initialize
						dataWrapper.appendChild(menulist);
						
						// Set the value after population
						setTimeout(() => {
							if (menulist.itemCount) {
								menulist.value = currentItemTypeID;
							}
						}, 0);
					} else {
						let valueElement = this.createValueElement({
							isMultiline: field.name === 'title',
							isNoWrap: false,
							editable: this.editable,
							text: commonValues[field.name],
							id: `multi-itembox-field-value-${field.name}`,
							attributes: {
								'aria-labelledby': labelElement.id,
								'fieldname': field.zoteroField
							}
						});
						
						// Add update handling
						if (this.editable) {
							valueElement.addEventListener('blur', () => {
								const newValue = valueElement.value?.trim();
								if (newValue !== commonValues[field.name]) {
									this._updateFieldForAllItems(field.name, newValue);
								}
							});
						}
						
						dataWrapper.appendChild(valueElement);
					}
				} else {
					// If there are multiple values, handle differently based on field
					if (field.name === 'itemType') {
						// For item type, create a menulist similar to itemBox
						const menulist = document.createXULElement("menulist", { is: "menulist-item-types" });
						menulist.id = "item-type-menu";
						menulist.className = "zotero-clicky keyboard-clickable";
						menulist.setAttribute("tabindex", 0);
						menulist.setAttribute("aria-labelledby", labelElement.id);
						
						if (!this.editable) {
							menulist.setAttribute("disabled", true);
						} else {
							menulist.addEventListener('command', (event) => {
								const newTypeID = parseInt(event.target.value);
								this._changeItemType(newTypeID);
							});
						}
						
						dataWrapper.appendChild(menulist);
					} else {
						// For other fields with multiple values
						let valueElement = this.createValueElement({
							isMultiline: field.name === 'title',
							isNoWrap: false,
							editable: this.editable,
							text: '(multiple values)',
							id: `multi-itembox-field-value-${field.name}`,
							attributes: {
								'aria-labelledby': labelElement.id,
								'fieldname': field.zoteroField
							},
							classList: ['empty']
						});
						
						// Add update handling
						if (this.editable) {
							valueElement.addEventListener('focus', () => {
								if (valueElement.value === '(multiple values)') {
									valueElement.value = '';
									valueElement.classList.remove('empty');
								}
							});
							
							valueElement.addEventListener('blur', () => {
								if (!valueElement.value.trim()) {
									valueElement.value = '(multiple values)';
									valueElement.classList.add('empty');
								} else {
									const newValue = valueElement.value.trim();
									this._updateFieldForAllItems(field.name, newValue);
								}
							});
						}
						
						dataWrapper.appendChild(valueElement);
					}
				}
				
				row.appendChild(labelWrapper);
				row.appendChild(dataWrapper);
				infoTable.appendChild(row);
			}
			
			section.appendChild(infoTable);
			container.appendChild(section);
		}
		
		/**
		 * Gets common field values across all selected items
		 * @returns {Object} Object with field names as keys and common values as values
		 */
		_getCommonFieldValues() {
			const commonValues = {};
			
			if (!this.items || !this.items.length) return commonValues;
			
			// Fields to check
			const fieldsToCheck = ['title', 'date'];
			
			// For each field, check if the value is the same across all items
			for (const field of fieldsToCheck) {
				const values = new Set();
				
				for (const item of this.items) {
					values.add(item.getField(field));
				}
				
				// If there's only one unique value (and it's not empty), it's common
				if (values.size === 1 && Array.from(values)[0] !== '') {
					commonValues[field] = Array.from(values)[0];
				}
			}
			
			// Special handling for item type
			const itemTypes = new Set();
			for (const item of this.items) {
				const typeName = Zotero.ItemTypes.getName(item.itemTypeID);
				itemTypes.add(typeName);
			}
			
			if (itemTypes.size === 1) {
				commonValues.itemType = Array.from(itemTypes)[0];
			}
			
			// Special handling for publication (could be in different fields)
			const publicationValues = new Set();
			for (const item of this.items) {
				let publicationField = this._getPublicationFieldForItemType(Zotero.ItemTypes.getName(item.itemTypeID));
				if (publicationField) {
					publicationValues.add(item.getField(publicationField));
				} else {
					// If any item doesn't have a publication field, we can't have a common value
					publicationValues.add('');
				}
			}
			
			if (publicationValues.size === 1 && Array.from(publicationValues)[0] !== '') {
				commonValues.publication = Array.from(publicationValues)[0];
			}
			
			return commonValues;
		}
		
		/**
		 * Gets the appropriate field name for publication based on item type
		 * @param {string} itemType - The item type name
		 * @returns {string|null} The field name for publication, or null if not applicable
		 */
		_getPublicationFieldForItemType(itemType) {
			const publicationFieldMap = {
				'journalArticle': 'publicationTitle',
				'magazineArticle': 'publicationTitle',
				'newspaperArticle': 'publicationTitle',
				'book': 'publisher',
				'bookSection': 'publicationTitle',
				'conferencePaper': 'conferenceName',
				'report': 'institution',
				'thesis': 'university'
			};
			
			return publicationFieldMap[itemType] || null;
		}
		
		/**
		 * Checks if a field is applicable to any of the selected items
		 * @param {string} fieldName - The field to check
		 * @returns {boolean} True if the field is applicable to any item
		 */
		_isFieldApplicableToAnyItem(fieldName) {
			if (fieldName !== 'publication') return true;
			
			for (const item of this.items) {
				const itemType = Zotero.ItemTypes.getName(item.itemTypeID);
				if (this._getPublicationFieldForItemType(itemType)) {
					return true;
				}
			}
			
			return false;
		}
		
		/**
		 * Updates a field for all selected items
		 * @param {string} fieldName - The name of the field to update
		 * @param {string} value - The new value for the field
		 */
		async _updateFieldForAllItems(fieldName, value) {
			if (!this.items || !this.items.length || !this.editable) return;
			
			await Zotero.DB.executeTransaction(async () => {
				for (const item of this.items) {
					if (fieldName === 'publication') {
						// For publication, need to determine the actual field based on item type
						const itemType = Zotero.ItemTypes.getName(item.itemTypeID);
						const actualField = this._getPublicationFieldForItemType(itemType);
						
						if (actualField) {
							item.setField(actualField, value);
						}
					} else {
						// For other fields, directly set the value
						item.setField(fieldName, value);
					}
					
					await item.save();
				}
			});
			
			// Refresh the view
			this._renderBulkEditorContainer();
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
			
			// Refresh the view
			this._renderBulkEditorContainer();
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
					if (index === 0 || index === array.length - 1) {
						return word.charAt(0).toUpperCase() + word.slice(1);
					}
					if (smallWords.test(word)) {
						return word;
					}
					return word.charAt(0).toUpperCase() + word.slice(1);
				})
				.join(' ');
		}
	}
	
	customElements.define("bulk-editor-box", BulkEditorBox);
}