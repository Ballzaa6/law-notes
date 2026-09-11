/**
 * maatra_star.js - ระบบติดดาว (Bookmark / Favorite) สำหรับทุกมาตราใน Dashboard กฎหมาย
 * รองรับการบันทึกสถานะผ่าน localStorage, การกรองดูเฉพาะมาตราสำคัญ, และ Event Delegation ประสิทธิภาพสูง
 */
(function() {
  'use strict';

  // ตรวจสอบชื่อหน้าเพื่อใช้เป็น storage key แยกแต่ละ dashboard
  const pagePath = window.location.pathname.split('/').pop() || 'default_dashboard';
  const STORAGE_KEY = 'maatra_starred_' + decodeURIComponent(pagePath);

  // โหลดรายชื่อมาตราที่ติดดาวจาก localStorage
  function loadStarredIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch (e) {
      console.warn('[maatra_star] Failed to load from localStorage:', e);
      return new Set();
    }
  }

  // บันทึกรายชื่อมาตราที่ติดดาวลง localStorage
  function saveStarredIds(set) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('[maatra_star] Failed to save to localStorage:', e);
    }
  }

  const starredSet = loadStarredIds();
  let isFilterActive = false;

  // CSS Injection
  function injectStyles() {
    if (document.getElementById('maatra-star-styles')) return;
    const style = document.createElement('style');
    style.id = 'maatra-star-styles';
    style.textContent = `
      /* Header & Card Star Styling */
      .maatra-header {
        position: relative !important;
      }
      
      .maatra-star-btn {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1.5px solid transparent;
        background: transparent;
        cursor: pointer;
        padding: 0;
        transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        outline: none;
        flex-shrink: 0;
        z-index: 2;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .maatra-star-btn svg {
        width: 20px;
        height: 20px;
        transition: all 0.22s ease;
        stroke: #9AA898;
        stroke-width: 2;
        fill: transparent;
        pointer-events: none;
      }

      .maatra-star-btn:hover {
        background: rgba(212, 160, 23, 0.12);
        border-color: rgba(212, 160, 23, 0.35);
        transform: scale(1.15);
      }

      .maatra-star-btn:hover svg {
        stroke: #D4A017;
      }

      .maatra-star-btn:active {
        transform: scale(0.9);
      }

      /* Starred State */
      .maatra-card.is-starred {
        border-color: #D4A017 !important;
        box-shadow: 3px 3px 0 #B8860B, 0 2px 12px rgba(212, 160, 23, 0.18) !important;
      }

      .maatra-card.is-starred .maatra-star-btn {
        background: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.5);
      }

      .maatra-card.is-starred .maatra-star-btn svg {
        stroke: #B45309;
        fill: #F59E0B;
        filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.45));
        transform: scale(1.05);
      }

      @keyframes starBounce {
        0% { transform: scale(0.8); }
        50% { transform: scale(1.35); }
        100% { transform: scale(1.05); }
      }

      .maatra-star-btn.just-starred svg {
        animation: starBounce 0.35s ease forwards;
      }

      /* Filter Bar / Controls */
      .star-filter-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin: 14px auto 6px;
        flex-wrap: wrap;
        max-width: 600px;
        position: relative;
        z-index: 10;
      }

      .star-filter-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        border-radius: 50px;
        border: 2px solid var(--border, #3D5A3E);
        background: var(--bg3, #F2EFE7);
        color: var(--text, #1E3120);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 2px 2px 0 var(--border, #3D5A3E);
        user-select: none;
      }

      .star-filter-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 3px 3px 0 var(--border, #3D5A3E);
      }

      .star-filter-btn.active {
        background: #F59E0B;
        color: #FFFFFF;
        border-color: #B45309;
        box-shadow: 2px 2px 0 #78350F;
      }

      .star-filter-btn .star-pill-icon {
        font-size: 16px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
      }

      .star-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 7px;
        border-radius: 50px;
        background: var(--accent1, #3D5A3E);
        color: #FFFFFF;
        font-size: 12px;
        font-weight: 700;
        font-family: 'IBM Plex Mono', monospace;
      }

      .star-filter-btn.active .star-count-badge {
        background: #78350F;
        color: #FEF3C7;
      }

      /* Hidden by Star Filter */
      .maatra-card.star-filtered-out {
        display: none !important;
      }

      /* Empty State when filter active and 0 stars */
      .star-empty-notice {
        text-align: center;
        padding: 40px 24px;
        background: var(--bg3, #F2EFE7);
        border: 2px dashed #D4A017;
        border-radius: 14px;
        max-width: 600px;
        margin: 30px auto;
        color: var(--text, #1E3120);
        box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      }
      .star-empty-notice h3 {
        font-size: 18px;
        margin-bottom: 8px;
        color: #B8860B;
      }
      .star-empty-notice p {
        font-size: 15px;
        color: var(--text-muted, #5A6E50);
      }
    `;
    document.head.appendChild(style);
  }

  const STAR_SVG = `
    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  `;

  // สร้างหรือเชื่อมปุ่มติดดาวเข้ากับการ์ด
  function setupCards() {
    const cards = document.querySelectorAll('.maatra-card');
    cards.forEach(card => {
      const id = card.id || card.getAttribute('data-id');
      if (!id) return;

      const header = card.querySelector('.maatra-header');
      if (!header) return;

      // ถ้ามีปุ่มดาวแล้วให้ข้าม
      if (header.querySelector('.maatra-star-btn')) return;

      const isStarred = starredSet.has(id);
      if (isStarred) {
        card.classList.add('is-starred');
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maatra-star-btn';
      btn.setAttribute('data-target-id', id);
      btn.setAttribute('title', isStarred ? 'ยกเลิกติดดาวมาตรานี้' : 'ติดดาวมาตราสำคัญนี้');
      btn.setAttribute('aria-label', isStarred ? 'ยกเลิกติดดาวมาตรานี้' : 'ติดดาวมาตราสำคัญนี้');
      btn.innerHTML = STAR_SVG;

      header.appendChild(btn);
    });
  }

  // สร้างปุ่มกรองมาตราติดดาวในแถบค้นหา
  function setupFilterBar() {
    if (document.getElementById('maatraStarFilterBar')) {
      updateFilterButton();
      return;
    }

    const searchWrapper = document.querySelector('.search-wrapper') || document.querySelector('.nav-bar') || document.querySelector('.hero');
    if (!searchWrapper) return;

    const container = document.createElement('div');
    container.id = 'maatraStarFilterBar';
    container.className = 'star-filter-container';

    container.innerHTML = `
      <button type="button" class="star-filter-btn" id="toggleStarFilterBtn" title="คลิกเพื่อสลับแสดงเฉพาะมาตราที่ติดดาว">
        <span class="star-pill-icon">⭐</span>
        <span>มาตราติดดาว</span>
        <span class="star-count-badge" id="starCountBadge">${starredSet.size}</span>
      </button>
    `;

    // แทรกหลัง searchWrapper หรือในตำแหน่งที่เหมาะสม
    if (searchWrapper.classList.contains('search-wrapper')) {
      searchWrapper.insertAdjacentElement('afterend', container);
    } else {
      searchWrapper.appendChild(container);
    }

    const btn = document.getElementById('toggleStarFilterBtn');
    if (btn) {
      btn.addEventListener('click', toggleStarFilter);
    }
  }

  // อัปเดตตัวเลขนับมาตราติดดาว
  function updateFilterButton() {
    const badge = document.getElementById('starCountBadge');
    if (badge) {
      badge.textContent = starredSet.size;
    }
  }

  // สลับโหมดตัวกรองมาตราติดดาว
  function toggleStarFilter() {
    isFilterActive = !isFilterActive;
    const btn = document.getElementById('toggleStarFilterBtn');
    if (btn) {
      btn.classList.toggle('active', isFilterActive);
    }
    applyStarFilter();
  }

  // ทำการกรองแสดง/ซ่อนมาตรา
  function applyStarFilter() {
    const cards = document.querySelectorAll('.maatra-card');
    const emptyNoticeId = 'starEmptyNotice';
    let emptyNotice = document.getElementById(emptyNoticeId);

    if (!isFilterActive) {
      // ปิดตัวกรอง: นำคลาส star-filtered-out ออกทั้งหมด
      cards.forEach(card => card.classList.remove('star-filtered-out'));
      if (emptyNotice) emptyNotice.remove();

      // ถ้ามีการค้นหาค้างอยู่ ให้ trigger search ใหม่
      const searchInput = document.getElementById('searchInput');
      if (searchInput && searchInput.value.trim()) {
        if (typeof window.doSearch === 'function') {
          window.doSearch(searchInput.value);
        } else if (typeof window.execSearch === 'function') {
          window.execSearch(searchInput.value);
        } else if (typeof window.runSearch === 'function') {
          window.runSearch(searchInput.value);
        }
      } else {
        // คืนค่าการแสดงผลเดิม
        cards.forEach(c => c.classList.remove('hidden'));
        document.querySelectorAll('.lugsana-section, .phak-section, .suan-block, .muat-section').forEach(s => {
          s.classList.remove('hidden');
        });
      }
      return;
    }

    // กรณีเปิดตัวกรอง
    let visibleStarredCount = 0;

    cards.forEach(card => {
      const isStarred = card.classList.contains('is-starred');
      if (isStarred) {
        card.classList.remove('star-filtered-out');
        visibleStarredCount++;
      } else {
        card.classList.add('star-filtered-out');
      }
    });

    // คลี่และแสดงเฉพาะ sections / blocks ที่มีมาตราติดดาว
    document.querySelectorAll('.lugsana-section, .muat-section, .phak-section, .suan-block').forEach(sec => {
      const hasVisibleCards = sec.querySelectorAll('.maatra-card:not(.star-filtered-out):not(.hidden)').length > 0;
      sec.classList.toggle('hidden', !hasVisibleCards);
      if (hasVisibleCards) {
        sec.classList.add('open');
        sec.classList.remove('collapsed');
      }
    });

    // หากไม่มีมาตราที่ติดดาวเลย แสดงข้อความแนะนำ
    const mainContainer = document.getElementById('mainContainer') || document.querySelector('.main-container') || document.body;
    if (visibleStarredCount === 0) {
      if (!emptyNotice) {
        emptyNotice = document.createElement('div');
        emptyNotice.id = emptyNoticeId;
        emptyNotice.className = 'star-empty-notice';
        emptyNotice.innerHTML = `
          <h3>⭐ ยังไม่มีมาตราที่ติดดาวในหน้านี้</h3>
          <p>กดที่ไอคอนรูปดาวมุมขวาบนของมาตราใดๆ เพื่อบันทึกเป็นมาตราสำคัญสำหรับอ่านทบทวนได้ทันที</p>
        `;
        const firstSec = mainContainer.querySelector('.phak-section, .lugsana-section, .maatra-card');
        if (firstSec) {
          firstSec.insertAdjacentElement('beforebegin', emptyNotice);
        } else {
          mainContainer.appendChild(emptyNotice);
        }
      }
    } else {
      if (emptyNotice) emptyNotice.remove();
    }
  }

  // Event Delegation สำหรับการคลิกปุ่มติดดาว
  document.addEventListener('click', function(e) {
    const starBtn = e.target.closest('.maatra-star-btn');
    if (!starBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const card = starBtn.closest('.maatra-card');
    const id = starBtn.getAttribute('data-target-id') || (card && card.id);
    if (!id || !card) return;

    const wasStarred = starredSet.has(id);

    if (wasStarred) {
      starredSet.delete(id);
      card.classList.remove('is-starred');
      starBtn.setAttribute('title', 'ติดดาวมาตราสำคัญนี้');
      starBtn.setAttribute('aria-label', 'ติดดาวมาตราสำคัญนี้');
      starBtn.classList.remove('just-starred');
    } else {
      starredSet.add(id);
      card.classList.add('is-starred');
      starBtn.setAttribute('title', 'ยกเลิกติดดาวมาตรานี้');
      starBtn.setAttribute('aria-label', 'ยกเลิกติดดาวมาตรานี้');
      starBtn.classList.remove('just-starred');
      void starBtn.offsetWidth; // trigger reflow
      starBtn.classList.add('just-starred');
    }

    saveStarredIds(starredSet);
    updateFilterButton();

    // ถ้ากำลังเปิดโหมดตัวกรองอยู่ ให้อัปเดตการแสดงผลการ์ดทันที
    if (isFilterActive) {
      applyStarFilter();
    }
  });

  // ผูกการค้นหากับการกรองติดดาว
  function hookSearchFunction() {
    if (typeof window.doSearch === 'function' && !window.doSearch._starHooked) {
      const origDoSearch = window.doSearch;
      window.doSearch = function(q) {
        origDoSearch(q);
        if (isFilterActive) {
          setTimeout(applyStarFilter, 210);
        }
      };
      window.doSearch._starHooked = true;
    }

    if (typeof window.execSearch === 'function' && !window.execSearch._starHooked) {
      const origExecSearch = window.execSearch;
      window.execSearch = function(q) {
        origExecSearch(q);
        if (isFilterActive) {
          applyStarFilter();
        }
      };
      window.execSearch._starHooked = true;
    }

    if (typeof window.runSearch === 'function' && !window.runSearch._starHooked) {
      const origRunSearch = window.runSearch;
      window.runSearch = function(q) {
        origRunSearch(q);
        if (isFilterActive) {
          applyStarFilter();
        }
      };
      window.runSearch._starHooked = true;
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput && !searchInput._starInputHooked) {
      searchInput.addEventListener('input', () => {
        if (isFilterActive) {
          setTimeout(applyStarFilter, 220);
        }
      });
      searchInput._starInputHooked = true;
    }
  }

  // เริ่มทำงานเมื่อ DOM พร้อม
  function init() {
    injectStyles();
    setupCards();
    setupFilterBar();
    hookSearchFunction();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ตรวจสอบกรณีคอนเทนต์ถูกโหลดเข้ามาภายหลัง (Dynamic Mutation)
  const observer = new MutationObserver((mutations) => {
    let hasNewCards = false;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        hasNewCards = true;
        break;
      }
    }
    if (hasNewCards) {
      setupCards();
      hookSearchFunction();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

})();
