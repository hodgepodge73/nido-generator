// app.js - Main Application Logic for NeeDoh Lab
import { Visualizer } from './visualizer.js';
import { sound } from './sound.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Visualizer
    const visualizer = new Visualizer('canvas-container');

    // Squeeze Button floating indicator click & hold binding
    const squeezeBtn = document.getElementById('squeeze-btn');
    if (squeezeBtn) {
        const startSqueeze = (e) => {
            e.preventDefault();
            visualizer.squeeze();
        };
        const endSqueeze = (e) => {
            e.preventDefault();
            visualizer.release();
        };

        squeezeBtn.addEventListener('mousedown', startSqueeze);
        squeezeBtn.addEventListener('mouseup', endSqueeze);
        squeezeBtn.addEventListener('mouseleave', endSqueeze);
        
        squeezeBtn.addEventListener('touchstart', startSqueeze, { passive: false });
        squeezeBtn.addEventListener('touchend', endSqueeze, { passive: false });
    }

    // 2. Tab Navigation Logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`panel-${targetTab}`).classList.add('active');
        });
    });

    // 3. Choice Card Selector Binding (Buttons like Shape, Filling, Texture, Faces, Box-type)
    const choiceCards = document.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
        card.addEventListener('click', () => {
            const controlType = card.getAttribute('data-control');
            const value = card.getAttribute('data-value');

            // Toggle active card within the same control group
            const parentPanel = card.closest('.tab-panel');
            const groupCards = parentPanel.querySelectorAll(`.choice-card[data-control="${controlType}"]`);
            groupCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Send config change to visualizer
            visualizer.updateConfig(controlType, value);
            updateSummary();
        });
    });

    // 4. Size Button Binding
    const sizeButtons = document.querySelectorAll('.size-btn');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const sizeVal = btn.getAttribute('data-value');
            
            visualizer.updateConfig('size', sizeVal);
            updateSummary();
        });
    });

    // 5. Segment Control Binding (Shell Material Glossy/Matte/Translucent)
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            segmentButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const materialVal = btn.getAttribute('data-value');

            visualizer.updateConfig('material', materialVal);
            
            // Show/Hide core color picker depending on translucent shells
            const coreColorGroup = document.getElementById('core-color-group');
            if (materialVal === 'translucent') {
                coreColorGroup.style.display = 'block';
            } else {
                coreColorGroup.style.display = 'none';
            }
            
            updateSummary();
        });
    });

    // 6. Color Palettes Swatch Binding
    const setupColorPalette = (paletteId, configKey) => {
        const palette = document.getElementById(paletteId);
        const swatches = palette.querySelectorAll('.color-swatch');
        
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                const hexColor = swatch.getAttribute('data-color');
                visualizer.updateConfig(configKey, hexColor);
            });
        });
    };
    setupColorPalette('shell-colors', 'shellColor');
    setupColorPalette('core-colors', 'coreColor');

    // Custom Color Input Binding
    const customShellColorInput = document.getElementById('custom-shell-color');
    customShellColorInput.addEventListener('input', (e) => {
        // Clear active preset swatches when custom color picked
        const swatches = document.getElementById('shell-colors').querySelectorAll('.color-swatch');
        swatches.forEach(s => s.classList.remove('active'));
        
        visualizer.updateConfig('shellColor', e.target.value);
    });

    // 7. Thermochromic Switch Binding
    const effectThermoCheckbox = document.getElementById('effect-thermo');
    effectThermoCheckbox.addEventListener('change', (e) => {
        visualizer.updateConfig('thermochromic', e.target.checked);
        updateSummary();
    });

    // 8. Custom Label Input Binding
    const customLabelInput = document.getElementById('custom-label');
    customLabelInput.addEventListener('input', (e) => {
        visualizer.updateConfig('customLabel', e.target.value || 'MY SQUISHY');
    });

    // 9. Show Packaging Window Toggle
    const showBoxCheckbox = document.getElementById('show-box-toggle');
    showBoxCheckbox.addEventListener('change', (e) => {
        visualizer.updateConfig('showBox', e.target.checked);
    });

    // 10. Sound Toggle Action
    const soundToggleBtn = document.getElementById('sound-toggle');
    soundToggleBtn.addEventListener('click', () => {
        const state = sound.toggle();
        soundToggleBtn.classList.toggle('active', state);
        
        const icon = soundToggleBtn.querySelector('i');
        if (state) {
            icon.setAttribute('data-lucide', 'volume-2');
        } else {
            icon.setAttribute('data-lucide', 'volume-x');
        }
        lucide.createIcons(); // refresh icons
    });
    // Set initial sound state active in button styles
    soundToggleBtn.classList.add('active');

    // 11. Presets Logic
    const presets = {
        'classic-pink': {
            shape: 'glob', size: 'classic', filling: 'dough', material: 'glossy',
            texture: 'smooth', shellColor: '#ff2a85', coreColor: '#00ffaa', thermochromic: false, face: 'none'
        },
        'nice-cube': {
            shape: 'cube', size: 'classic', filling: 'maltose', material: 'matte',
            texture: 'smooth', shellColor: '#00c3ff', coreColor: '#ffffff', thermochromic: false, face: 'none'
        },
        'cool-cat': {
            shape: 'cat', size: 'classic', filling: 'dough', material: 'glossy',
            texture: 'smooth', shellColor: '#00ffaa', coreColor: '#ffae00', thermochromic: false, face: 'cool'
        },
        'water-beads': {
            shape: 'glob', size: 'classic', filling: 'beads', material: 'translucent',
            texture: 'smooth', shellColor: '#ffffff', coreColor: '#ff2a85', thermochromic: false, face: 'smiley'
        },
        'glitter-gel': {
            shape: 'glob', size: 'classic', filling: 'gel', material: 'translucent',
            texture: 'spiky', shellColor: '#ffffff', coreColor: '#a600ff', thermochromic: false, face: 'none'
        },
        'stardust': {
            shape: 'glob', size: 'classic', filling: 'shimmer', material: 'translucent',
            texture: 'ribbed', shellColor: '#ffffff', coreColor: '#ffae00', thermochromic: true, face: 'none'
        }
    };

    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const presetKey = btn.getAttribute('data-preset');
            const config = presets[presetKey];
            if (config) {
                applyConfigToUI(config);
            }
        });
    });

    // Helper to programmatically map an object configuration to the visualizer and sidebar controls
    function applyConfigToUI(cfg) {
        // Update visualizer configuration variables
        for (const [key, val] of Object.entries(cfg)) {
            visualizer.config[key] = val;
        }

        // Rebuild model inside WebGL
        visualizer.rebuildSquishy();

        // Sync visual DOM indicators
        // Active Shape/Filling/Texture/Face cards
        ['shape', 'filling', 'texture', 'face'].forEach(controlType => {
            const val = cfg[controlType] || 'none';
            const cards = document.querySelectorAll(`.choice-card[data-control="${controlType}"]`);
            cards.forEach(c => {
                c.classList.toggle('active', c.getAttribute('data-value') === val);
            });
        });

        // Size button sync
        const sizeBtns = document.querySelectorAll('.size-btn');
        sizeBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-value') === cfg.size);
        });

        // Material segment sync
        const segmentBtns = document.querySelectorAll('.segment-btn');
        segmentBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-value') === cfg.material);
        });

        // Toggle visibility of core color palette
        const coreColorGroup = document.getElementById('core-color-group');
        coreColorGroup.style.display = cfg.material === 'translucent' ? 'block' : 'none';

        // Checkbox states
        effectThermoCheckbox.checked = cfg.thermochromic;

        // Reset color swatches selection
        const shellSwatches = document.getElementById('shell-colors').querySelectorAll('.color-swatch');
        shellSwatches.forEach(s => {
            s.classList.toggle('active', s.getAttribute('data-color') === cfg.shellColor);
        });

        const coreSwatches = document.getElementById('core-colors').querySelectorAll('.color-swatch');
        coreSwatches.forEach(s => {
            s.classList.toggle('active', s.getAttribute('data-color') === cfg.coreColor);
        });

        // Set custom color input values
        if (cfg.shellColor.startsWith('#')) customShellColorInput.value = cfg.shellColor;

        updateSummary();
    }

    // Dynamic Price/Summary update
    const specText = document.getElementById('spec-text');
    const priceText = document.querySelector('.price-estimate');

    function updateSummary() {
        const shapeNames = { glob: 'Glob', cube: 'Cube', cat: 'Cool Cat', donut: 'Doh-Nut', gumdrop: 'Gumdrop' };
        const materialNames = { glossy: 'Glossy', matte: 'Powdery Matte', translucent: 'Translucent' };
        const sizeNames = { teenie: 'Teenie', classic: 'Classic', super: 'Super' };
        
        const shape = shapeNames[visualizer.config.shape] || 'Glob';
        const mat = materialNames[visualizer.config.material] || 'Opaque';
        const size = sizeNames[visualizer.config.size] || 'Classic';

        specText.innerText = `${size} • ${mat} ${shape}`;

        // Compute Price
        let price = 12.99;
        if (visualizer.config.size === 'teenie') price -= 3.00;
        if (visualizer.config.size === 'super') price += 5.00;
        if (visualizer.config.material === 'translucent') price += 1.50; // extra for gel/beads
        if (visualizer.config.thermochromic) price += 1.00;

        priceText.innerText = `$${price.toFixed(2)}`;
    }

    // 12. Local Storage Saved Collection Logic
    const galleryModal = document.getElementById('gallery-modal');
    const galleryBtn = document.getElementById('gallery-btn');
    const closeGalleryBtn = document.getElementById('close-gallery');
    const galleryGrid = document.getElementById('gallery-grid');
    const emptyGalleryState = document.getElementById('empty-gallery-state');

    const getSavedCreations = () => {
        return JSON.parse(localStorage.getItem('needoh_saved_designs') || '[]');
    };

    const saveCreations = (creations) => {
        localStorage.setItem('needoh_saved_designs', JSON.stringify(creations));
    };

    // Open Gallery modal
    galleryBtn.addEventListener('click', () => {
        renderGallery();
        galleryModal.classList.add('open');
    });

    closeGalleryBtn.addEventListener('click', () => {
        galleryModal.classList.remove('open');
    });

    // Download Image Button Handler
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // Flash feedback animation on button
            const icon = downloadBtn.querySelector('i');
            const originalIcon = icon.getAttribute('data-lucide');
            
            icon.setAttribute('data-lucide', 'check');
            downloadBtn.style.color = 'var(--neon-green)';
            downloadBtn.style.borderColor = 'var(--neon-green)';
            downloadBtn.style.background = 'rgba(0, 255, 170, 0.15)';
            lucide.createIcons();

            setTimeout(() => {
                icon.setAttribute('data-lucide', originalIcon);
                downloadBtn.style.color = '';
                downloadBtn.style.borderColor = '';
                downloadBtn.style.background = '';
                lucide.createIcons();
            }, 1500);

            // Generate PNG data URL
            const dataURL = visualizer.takeScreenshot();
            
            // Trigger browser download
            const link = document.createElement('a');
            const fileName = (visualizer.config.customLabel || 'my_needoh').trim().toLowerCase().replace(/\s+/g, '_');
            link.download = `${fileName}_needoh.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Add Design Button Handler
    const saveDesignBtn = document.getElementById('save-design-btn');
    saveDesignBtn.addEventListener('click', () => {
        const creations = getSavedCreations();
        
        // Build a unique design item
        const labelName = visualizer.config.customLabel.trim() || 'My Squishy';
        const newItem = {
            id: 'design_' + Date.now(),
            name: labelName,
            config: { ...visualizer.config }
        };

        creations.unshift(newItem); // add to top
        saveCreations(creations);

        // Flash "Save Design" feedback animation
        const originalText = saveDesignBtn.innerHTML;
        saveDesignBtn.innerHTML = '<i data-lucide="check"></i> Saved!';
        saveDesignBtn.style.background = 'rgba(0, 255, 170, 0.15)';
        saveDesignBtn.style.color = 'var(--neon-green)';
        saveDesignBtn.style.borderColor = 'var(--neon-green)';
        lucide.createIcons();

        setTimeout(() => {
            saveDesignBtn.innerHTML = originalText;
            saveDesignBtn.style.background = '';
            saveDesignBtn.style.color = '';
            saveDesignBtn.style.borderColor = '';
            lucide.createIcons();
        }, 1500);
    });

    // Render local creations list inside gallery
    function renderGallery() {
        galleryGrid.innerHTML = '';
        const items = getSavedCreations();

        if (items.length === 0) {
            emptyGalleryState.style.display = 'flex';
            return;
        }
        
        emptyGalleryState.style.display = 'none';

        const shapeEmojis = { glob: '🔵', cube: '🟩', cat: '🐱', donut: '🍩', gumdrop: '🔺' };

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            
            const emoji = shapeEmojis[item.config.shape] || '🔵';
            
            card.innerHTML = `
                <button class="delete-gallery-btn" data-id="${item.id}" title="Delete creation">
                    <i data-lucide="trash-2"></i>
                </button>
                <div class="gallery-card-preview" style="color: ${item.config.shellColor}">
                    ${emoji}
                </div>
                <div class="gallery-card-title">${item.name}</div>
                <div class="gallery-card-info">
                    Size: ${item.config.size}<br>
                    Filling: ${item.config.filling}<br>
                    Texture: ${item.config.texture}
                </div>
                <div class="gallery-card-actions">
                    <button class="load-design-btn primary-btn" data-id="${item.id}">Load</button>
                </div>
            `;

            // Bind delete button
            const delBtn = card.querySelector('.delete-gallery-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let saved = getSavedCreations();
                saved = saved.filter(s => s.id !== item.id);
                saveCreations(saved);
                renderGallery();
            });

            // Bind load button
            const loadBtn = card.querySelector('.load-design-btn');
            loadBtn.addEventListener('click', () => {
                applyConfigToUI(item.config);
                galleryModal.classList.remove('open');
            });

            galleryGrid.appendChild(card);
        });
        
        lucide.createIcons(); // refresh icons inside gallery cards
    }

    // 13. Checkout / Order Modal Logic
    const checkoutModal = document.getElementById('checkout-modal');
    const orderBtn = document.getElementById('order-btn');
    const closeCheckoutBtn = document.getElementById('close-checkout');
    const receiptSpecsList = document.getElementById('receipt-specs');

    orderBtn.addEventListener('click', () => {
        // Pop receipt specifications
        receiptSpecsList.innerHTML = '';
        
        const shapeNames = { glob: 'Classic Glob', cube: 'Nice Cube', cat: 'Cool Cat', donut: 'Doh-Nut', gumdrop: 'Gumdrop' };
        const sizeNames = { teenie: 'Teenie Mini', classic: 'Standard Classic', super: 'Super Giant' };
        const fillingNames = { 
            dough: 'PVA Groovy Dough', 
            maltose: 'Slow-Rise Maltose Compound', 
            beads: 'Tactile Water Beads', 
            gel: 'Glitter Goo Gel', 
            shimmer: 'Metallic Shimmer Liquid' 
        };

        const specs = [
            `Shape: ${shapeNames[visualizer.config.shape]}`,
            `Size: ${sizeNames[visualizer.config.size]}`,
            `Filling Compound: ${fillingNames[visualizer.config.filling]}`,
            `Shell Casing: ${visualizer.config.material} texture`,
            `Base Color: ${visualizer.config.shellColor}`,
            `Thermochromic Shift: ${visualizer.config.thermochromic ? 'Yes' : 'No'}`
        ];

        specs.forEach(spec => {
            const li = document.createElement('li');
            li.innerText = spec;
            receiptSpecsList.appendChild(li);
        });

        checkoutModal.classList.add('open');
    });

    closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('open');
    });

    // 14. Initial summary setup
    updateSummary();
    
    // Auto-load classic pink preset initially
    applyConfigToUI(presets['classic-pink']);
});
