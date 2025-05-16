
{
	// const { ItemDetails } = ChromeUtils.importESModule("chrome://zotero/content/elements/itemDetails.js");
	const ItemDetails = customElements.get("item-details");
 	class MultiInfoBox extends ItemDetails {
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
		content =MozXULElement.parseXULToFragment(`
      <hbox id="zotero-view-item-container" class="zotero-view-multi-item-container" flex="1">
        <html:div class="zotero-view-item-main">          
          <html:div id="zotero-view-multi-item" class="zotero-view-item" tabindex="0">
            <collapsible-section data-l10n-id="section-multi-citation" data-pane="bulk-cite" style="width:100%">
              <html:div id="zotero-view-multi-item-citation">
              </html:div>
            </collapsible-section>
            <bulk-editor-box id="zotero-multi-item-bulk-editor" data-pane="bulk-edit"/>
          </html:div>
        </html:div>
      </hbox>
    `);

		init() {
			this._container = this.querySelector('#zotero-view-item-container');
			this._paneParent = this.querySelector('#zotero-view-multi-item');
      this._citationContainer = this.querySelector('#zotero-view-multi-item-citation');
      this._bulkEditor = this.querySelector('#zotero-multi-item-bulk-editor');
      this._multiCiteSection = this.querySelector('collapsible-section[data-pane="bulk-cite"]');

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
			this._skipRender = false;
		}

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
		}

		static get observedAttributes() {
			return ['pinnedPane'];
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

      if (this._citationContainer) {
        this._renderCitationsContainer();
      } else {
        console.warn("Citation container not found in MultiInfoBox");
      }
      
      if (this._bulkEditor) {
        this._bulkEditor.items = items;
        this._bulkEditor.editable = this.editable;
        this._bulkEditor.tabType = this.tabType;
      }
      
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
      
      this._multiCiteSection.label = `${this.items.length} items selected`;
      this._citationContainer.innerHTML = '';
      
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
	}
	customElements.define("multi-info-box", MultiInfoBox);
}
