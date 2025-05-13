
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
      console.log('MultiInfoBox render');
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

      this._citationContainer.innerHTML = '';
      const newCitation = document.createElement('div');
      for (let item of items) {
        const citation = IndigoBook.generateCitation(item) || item.get;
        newCitation.innerHTML += `${citation}; `;
      }
      this._citationContainer.appendChild(newCitation);
      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy';
      copyButton.addEventListener('click', () => {
        Zotero.Utilities.Internal.copyFormattedCitation(newCitation);
      });
      console.log('citation container', this._citationContainer.innerHTML);      
      this._isRendering = false;

			if (Zotero.test) {
				resolve();
			}
		}
	}
	customElements.define("multi-info-box", MultiInfoBox);
}
