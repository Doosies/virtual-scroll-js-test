// 설정을 상단에 상수로 정의하여 관리 용이성을 높임
const CONFIG = {
    TOTAL_ITEMS: 1000,
    ESTIMATED_ITEM_HEIGHT: 60,
    OVERSCAN_COUNT: 5,
};

class VirtualScroller {
    /**
     * @param {HTMLElement} scrollContainer 스크롤이 발생하는 컨테이너
     * @param {object[]} items 렌더링할 전체 아이템 데이터
     */
    constructor(scrollContainer, items) {
        this.scrollContainer = scrollContainer;
        // listContainer는 scrollContainer의 자식으로 가정
        this.listContainer = scrollContainer.querySelector('#list-container');
        this.items = items;
        this.heightCache = {};
        this.isRenderScheduled = false;

        // ResizeObserver 콜백에서 this 컨텍스트를 유지하기 위해 바인딩
        this._handleResize = this._handleResize.bind(this);
        this.observer = new ResizeObserver(this._handleResize);
    }

    /** 캐시 또는 추정 높이를 반환합니다. */
    _getCachedHeight(index) {
        return this.heightCache[index] ?? CONFIG.ESTIMATED_ITEM_HEIGHT;
    }

    /** 전체 리스트의 총 높이를 계산합니다. */
    _calculateTotalHeight() {
        let totalHeight = 0;
        for (let i = 0; i < CONFIG.TOTAL_ITEMS; i++) {
            totalHeight += this._getCachedHeight(i);
        }
        return totalHeight;
    }

    /** 특정 인덱스의 Y축 오프셋(top 위치)을 계산합니다. */
    _getOffsetForIndex(index) {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += this._getCachedHeight(i);
        }
        return offset;
    }

    /** 렌더링할 아이템의 범위를 계산합니다. */
    _calculateVisibleRange() {
        const scrollTop = this.scrollContainer.scrollTop;
        const viewportHeight = this.scrollContainer.clientHeight;

        let startIndex = 0;
        let startOffset = 0;
        // 시작 인덱스 찾기
        while (startOffset < scrollTop && startIndex < CONFIG.TOTAL_ITEMS) {
            startOffset += this._getCachedHeight(startIndex);
            startIndex++;
        }

        let endIndex = startIndex;
        let endOffset = startOffset;
        // 끝 인덱스 찾기
        while (
            endOffset < scrollTop + viewportHeight &&
            endIndex < CONFIG.TOTAL_ITEMS
        ) {
            endOffset += this._getCachedHeight(endIndex);
            endIndex++;
        }

        // Overscan 적용
        return {
            startIndex: Math.max(0, startIndex - CONFIG.OVERSCAN_COUNT),
            endIndex: Math.min(
                CONFIG.TOTAL_ITEMS - 1,
                endIndex + CONFIG.OVERSCAN_COUNT
            ),
        };
    }

    /** 단일 아이템 DOM 요소를 생성합니다. */
    _createItemElement(index) {
        const itemData = this.items[index];
        const top = this._getOffsetForIndex(index);

        const element = document.createElement('div');
        element.dataset.index = index;
        element.classList.add('item');
        element.style.top = `${top}px`;
        element.innerHTML = `
      <div>${itemData.title}</div>
      <div>${itemData.value}</div>
    `;
        return element;
    }

    /** 렌더링을 스케줄링합니다. */
    _scheduleRender() {
        if (this.isRenderScheduled) return;
        this.isRenderScheduled = true;
        requestAnimationFrame(() => {
            this._render();
            this.isRenderScheduled = false;
        });
    }

    /** 화면을 렌더링합니다. */
    _render() {
        const { startIndex, endIndex } = this._calculateVisibleRange();
        const fragment = document.createDocumentFragment();

        for (let i = startIndex; i <= endIndex; i++) {
            const element = this._createItemElement(i);
            fragment.appendChild(element);

            if (this.heightCache[i] === undefined) {
                this.observer.observe(element);
            }
        }
        this.listContainer.replaceChildren(fragment);
    }

    /** ResizeObserver 콜백 핸들러입니다. */
    _handleResize(entries) {
        let needsUpdate = false;
        for (const entry of entries) {
            const element = entry.target;
            const index = Number(element.dataset.index);
            const newHeight = Math.round(
                element.getBoundingClientRect().height
            );

            if (this.heightCache[index] === undefined && newHeight > 0) {
                this.heightCache[index] = newHeight;
                needsUpdate = true;
                this.observer.unobserve(element);
            }
        }
        if (needsUpdate) {
            this.listContainer.style.height = `${this._calculateTotalHeight()}px`;
            this._scheduleRender();
        }
    }

    /** 스크롤 이벤트 핸들러입니다. */
    _handleScroll() {
        this._scheduleRender();
    }

    /** 가상 스크롤러를 초기화하고 시작합니다. */
    init() {
        this.listContainer.style.height = `${this._calculateTotalHeight()}px`;
        this._render();
        this.scrollContainer.addEventListener(
            'scroll',
            this._handleScroll.bind(this)
        );
    }
}

// --- Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    const items = [];
    for (let i = 0; i < CONFIG.TOTAL_ITEMS; i++) {
        const repeat = Math.floor(Math.random() * 11);
        items.push({
            title: `${i} 번째 아이템`,
            value: '아이템<br/>'.repeat(repeat),
        });
    }

    const scroller = new VirtualScroller(
        document.getElementById('scroll-container'),
        items
    );

    scroller.init();
});
