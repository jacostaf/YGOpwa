      // Mock modal elements with querySelector
      const mockModal = {
        querySelector: vi.fn((selector) => {
          if (selector === '.modal-close') {
            return {
              addEventListener: vi.fn()
            };
          }
          return null;
        }),
        innerHTML: '',
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      };
      
      const mockModalOverlay = {
        innerHTML: '',
        appendChild: vi.fn(),
        classList: {
          remove: vi.fn(),
          add: vi.fn()
        }
      };
      
      const mockPriceForm = {
        reset: vi.fn(),
        addEventListener: vi.fn()
      };
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'div') return mockModal;
        return document.createElement(tagName);
      });
      
      vi.spyOn(document, 'getElementById').mockImplementation((id) => {
        if (id === 'modal-overlay') return mockModalOverlay;
        if (id === 'price-form') return mockPriceForm;
        return null;
      });