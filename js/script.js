window.addEventListener("load", () => {
    gsap.registerPlugin(ScrollTrigger);

    /* ==============================================================
       1. CUSTOM CURSOR & MAGNETISMO
       ============================================================== */
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    window.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: "power2.out" });
    });

    document.querySelectorAll('a, button, .btn').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });

    document.querySelectorAll('.btn-gold, .btn-navy').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
            const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
            gsap.to(btn, { x: x, y: y, duration: 0.3, ease: "power2.out" });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
        });
    });

    /* ==============================================================
       2. ANIMAZIONE HERO
       ============================================================== */
    gsap.set(".gsap-hero-item > *", { autoAlpha: 1 });

    const tlHero = gsap.timeline();
    
    tlHero.from(".hero-overlay", { scale: 1.1, opacity: 0, duration: 1, ease: "power2.out" })
          .from(".hero-eyebrow, .hero-title, .hero-subtitle, .hero-actions", {
              y: 30,
              opacity: 0,
              duration: 0.8,
              stagger: 0.2, 
              ease: "power2.out"
          }, "-=0.5");

    /* ==============================================================
       3. SCROLL ORIZZONTALE (SEZIONE METODO)
       ============================================================== */
    const horizontalWrapper = document.querySelector(".horizontal-wrapper");
    const panels = gsap.utils.toArray(".horizontal-panel");
    
    if (horizontalWrapper && panels.length > 0) {
        let getScrollAmount = () => horizontalWrapper.scrollWidth - window.innerWidth;

        gsap.to(panels, {
            x: () => -getScrollAmount(),
            ease: "none",
            scrollTrigger: {
                trigger: ".metodo-section",
                pin: true,
                scrub: 1,
                end: () => "+=" + getScrollAmount(),
                invalidateOnRefresh: true
            }
        });
    }

    /* ==============================================================
       4. ANIMAZIONI ALLO SCROLL
       ============================================================== */
    gsap.set(".gsap-fade", { autoAlpha: 1 });
    
    ScrollTrigger.batch(".gsap-fade", {
        interval: 0.1, 
        batchMax: 3,   
        onEnter: batch => gsap.from(batch, {
            opacity: 0,
            y: 40,
            duration: 0.8,
            stagger: 0.15, 
            ease: "power2.out"
        }),
        start: "top 85%"
    });

    /* ==============================================================
       5. CONTATORI ANIMATI
       ============================================================== */
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        const target = parseFloat(stat.getAttribute('data-count'));
        const suffix = stat.getAttribute('data-suffix') || '';

        gsap.set(stat.closest('.gsap-stat'), { autoAlpha: 1 });

        ScrollTrigger.create({
            trigger: stat.closest('.gsap-stat'),
            start: "top 80%",
            once: true,
            onEnter: () => {
                let obj = { val: 0 };
                gsap.from(stat.closest('.gsap-stat'), { y: 40, opacity: 0, duration: 0.8, ease: "power2.out" });
                gsap.to(obj, {
                    val: target,
                    duration: 2.5,
                    ease: "power3.out",
                    onUpdate: () => { stat.innerText = Math.floor(obj.val) + suffix; }
                });
            }
        });
    });
});