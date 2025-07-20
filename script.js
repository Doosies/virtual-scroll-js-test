const CONFIG = {
    TOTAL_ITEMS: 1000000,
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
        this.scrollAnchor = { index: 0, offset: 0 };

        this.observer = new ResizeObserver(this.#handleResize.bind(this));
    }

    /** 캐시 또는 추정 높이를 반환*/
    #getCachedHeight(index) {
        return this.heightCache[index] ?? CONFIG.ESTIMATED_ITEM_HEIGHT;
    }

    /** 전체 리스트의 총 높이를 계산 */
    #calculateTotalHeight() {
        let totalHeight = 0;
        for (let i = 0; i < CONFIG.TOTAL_ITEMS; i++) {
            totalHeight += this.#getCachedHeight(i);
        }
        return totalHeight;
    }

    /** 특정 인덱스의 Y축 오프셋(top 위치)을 계산 */
    #getOffsetForIndex(index) {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += this.#getCachedHeight(i);
        }
        return offset;
    }

    /** 렌더링할 아이템의 범위를 계산*/
    #calculateVisibleRange() {
        const scrollTop = this.scrollContainer.scrollTop;
        const viewportHeight = this.scrollContainer.clientHeight;

        let startIndex = 0;
        let startOffset = 0;
        // 시작 인덱스 찾기
        while (startOffset < scrollTop && startIndex < CONFIG.TOTAL_ITEMS) {
            startOffset += this.#getCachedHeight(startIndex);
            startIndex++;
        }

        let endIndex = startIndex;
        let endOffset = startOffset;
        // 끝 인덱스 찾기
        while (
            endOffset < scrollTop + viewportHeight &&
            endIndex < CONFIG.TOTAL_ITEMS
        ) {
            endOffset += this.#getCachedHeight(endIndex);
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

    /** 단일 아이템 DOM 요소를 생성*/
    #createItemElement(index) {
        const itemData = this.items[index];
        const top = this.#getOffsetForIndex(index);

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

    /** 렌더링 직전, 현재 화면의 기준점을 포착*/
    #captureScrollAnchor() {
        const scrollTop = this.scrollContainer.scrollTop;
        let index = 0;
        let currentOffset = 0;

        // ✨ 수정된 부분
        while (currentOffset < scrollTop && index < CONFIG.TOTAL_ITEMS) {
            // 개별 아이템의 높이를 순차적으로 더함
            currentOffset += this.#getCachedHeight(index);
            index++;
        }

        const correctIndex = Math.max(0, index - 1);
        this.scrollAnchor = {
            index: correctIndex,
            offset: scrollTop - this.#getOffsetForIndex(correctIndex),
        };
    }

    /** 렌더링을 스케줄링 */
    #scheduleRender() {
        if (this.isRenderScheduled) return;
        this.isRenderScheduled = true;
        requestAnimationFrame(() => {
            this.#render();
            this.isRenderScheduled = false;
        });
    }

    /** 화면을 렌더 */
    #render() {
        this.#captureScrollAnchor();

        const { startIndex, endIndex } = this.#calculateVisibleRange();
        const fragment = document.createDocumentFragment();

        for (let i = startIndex; i <= endIndex; i++) {
            const element = this.#createItemElement(i);
            fragment.appendChild(element);

            if (this.heightCache[i] === undefined) {
                this.observer.observe(element);
            }
        }
        this.listContainer.replaceChildren(fragment);
    }

    /** ResizeObserver 콜백 핸들러 */
    #handleResize(entries) {
        let needsUpdate = false;
        const oldAnchorY = this.#getOffsetForIndex(this.scrollAnchor.index);

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
            this.listContainer.style.height = `${this.#calculateTotalHeight()}px`;

            const newAnchorY = this.#getOffsetForIndex(this.scrollAnchor.index);
            const delta = newAnchorY - oldAnchorY;
            this.scrollContainer.scrollTop += delta;

            this.#scheduleRender();
        }
    }

    /** 스크롤 이벤트 핸들러 */
    #handleScroll() {
        this.#scheduleRender();
    }

    /** 가상 스크롤러를 초기화하고 시작 */
    init() {
        this.listContainer.style.height = `${this.#calculateTotalHeight()}px`;
        this.#render();
        this.scrollContainer.addEventListener(
            'scroll',
            this.#handleScroll.bind(this)
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

// 지금 상태로는 스크롤이 튐
// 보정로직 필요할듯
// 높이변경 -> scrollTop 더하기

// 근데 getOffsetForIndex, calculateVisibleRange에서 모든 아이템의 높이를 계싼함
// 1000000 도달 안했는데 278877 에서 더이상 스크롤 못내림
