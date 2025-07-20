const TOTAL_ITEMS = 100; // 아이템 개수를 1000개로 늘림
const ITEM_HEIGHT = 40; // 모든 아이템의 높이를 40px로 고정
const PADDING_CONTENTS = 5;

const items = [];
const cache = [];

function createItems() {
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    const repeat = Math.floor(Math.random() * 11);
    const item = {
      title: `${i} 번쨰 아이템`,
      value: "아이템<br/>".repeat(repeat),
    };
    items.push(item);
  }
}

function getCurrentTop(index) {
  let result = 0;
  for (let i = 0; i < index; i++) {
    result += cache[i] ?? ITEM_HEIGHT;
  }
  return result;
}

document.addEventListener("DOMContentLoaded", () => {
  const scrollContainer = document.getElementById("scroll-container");
  const listContainer = document.getElementById("list-container");

  const resizeObserver = new ResizeObserver((entries) => {
    let needUpdate = false;
    entries.forEach((entry) => {
      const now_element = entry.target;
      const index = Number(now_element.dataset.index);

      if (cache[index] === undefined) {
        cache[index] = now_element.getBoundingClientRect().height;
        needUpdate = true;
      }
    });

    if (needUpdate) {
      updateListContainerHeight();
      renderVisibleItems();
    }
  });

  function updateListContainerHeight() {
    let height = 0;
    for (let i = 0; i < TOTAL_ITEMS; i++) {
      height += cache[i] ?? ITEM_HEIGHT;
    }
    listContainer.style.height = `${height}px`;
  }

  function renderVisibleItems() {
    // 문서 맨위 ~ el 바로위
    const scrollTop = scrollContainer.scrollTop;
    // scroolTop + 실제 el height(padding등 제외하고 높이)
    // 즉, el 바닥 위치(padding제외)
    const containerHeight = scrollTop + scrollContainer.clientHeight;

    const resultFragment = document.createDocumentFragment();

    // 가상스크롤 시작부분 계산
    let startIndex = 0;
    let currentOffset = 0;
    while (currentOffset < scrollTop && startIndex < TOTAL_ITEMS) {
      currentOffset += cache[startIndex] ?? ITEM_HEIGHT;
      startIndex++;
    }
    startIndex = Math.max(0, startIndex - PADDING_CONTENTS);

    // 가상스크롤 끝부분 계산
    let endIndex = startIndex;
    while (
      currentOffset < scrollTop + containerHeight &&
      endIndex < TOTAL_ITEMS
    ) {
      currentOffset += cache[endIndex] ?? ITEM_HEIGHT;
      endIndex++;
    }
    endIndex = Math.min(TOTAL_ITEMS - 1, endIndex + PADDING_CONTENTS);

    // 2. 그 후 index를 가지고서 현재 top을 계산함
    let currentTop = getCurrentTop(startIndex);

    for (let i = startIndex; i <= endIndex; i++) {
      const currentItem = items[i];

      const item = document.createElement("div");
      item.dataset.index = i;
      item.classList.add("item");
      item.style.top = `${currentTop}px`;

      const title = document.createElement("div");
      title.innerHTML = currentItem.title;

      const value = document.createElement("div");
      value.innerHTML = currentItem.value;

      item.appendChild(title);
      item.appendChild(value);

      resultFragment.appendChild(item);

      if (cache[i] === undefined) {
        resizeObserver.observe(item);
      }

      currentTop += cache[i] ?? ITEM_HEIGHT;
    }

    listContainer.replaceChildren(resultFragment);
  }

  createItems();
  updateListContainerHeight();
  renderVisibleItems();

  scrollContainer.addEventListener("scroll", renderVisibleItems);
});

// 1. 초기의 height은 고정해서 계산 해야함.
// 2. 해당 컨텐츠의 실제 height이 변경되면 observe를 호출함
//  - 여기서 해당 컨텐츠의 높이가 변겨=
