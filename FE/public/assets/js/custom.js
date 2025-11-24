$(function () {
  // ================================
  // Header Scroll
  // ================================
  $(window).scroll(function () {
    const header = $('header');
    if (header.length === 0) return; // FIX: tránh lỗi nếu không có header

    if ($(window).scrollTop() >= 60) {
      header.addClass('fixed-header');
    } else {
      header.removeClass('fixed-header');
    }
  });

  // ================================
  // Featured Owl Carousel
  // ================================
  const featuredSlider = $('.featured-projects-slider .owl-carousel');

  if (featuredSlider.length > 0) {
    // FIX: Nếu không có carousel thì bỏ qua
    featuredSlider.owlCarousel({
      center: true,
      loop: true,
      margin: 30,
      nav: false,
      dots: false,
      autoplay: true,
      autoplayTimeout: 5000,
      autoplayHoverPause: false,
      responsive: {
        0: { items: 1 },
        600: { items: 2 },
        1000: { items: 3 },
        1200: { items: 4 },
      },
    });
  }

  // ================================
  // Count animation
  // ================================
  $('.count').each(function () {
    const countEl = $(this);
    if (!countEl.length) return;

    countEl.prop('Counter', 0).animate(
      {
        Counter: countEl.text(),
      },
      {
        duration: 1000,
        easing: 'swing',
        step: function (now) {
          countEl.text(Math.ceil(now));
        },
      }
    );
  });

  // ================================
  // ScrollToTop
  // ================================
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  const scrollBtn = document.getElementById('scrollToTopBtn');

  if (scrollBtn) {
    // FIX: kiểm tra tồn tại trước khi thêm sự kiện
    scrollBtn.addEventListener('click', scrollToTop);
  }

  window.onscroll = function () {
    const btn = document.getElementById('scrollToTopBtn');
    if (!btn) return; // FIX QUAN TRỌNG

    if (document.documentElement.scrollTop > 100 || document.body.scrollTop > 100) {
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  };

  // ================================
  // AOS
  // ================================
  if (typeof AOS !== 'undefined') {
    AOS.init({
      once: true,
    });
  }
});