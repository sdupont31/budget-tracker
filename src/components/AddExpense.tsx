import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useExpenses } from '../hooks/useExpenses';
import type { Category } from '../types';

interface AddExpenseProps {
  onClose: () => void;
}

const font = '-apple-system,BlinkMacSystemFont,sans-serif';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid #D1D1D6',
  backgroundColor: '#F2F2F7',
  fontSize: 15,
  fontFamily: font,
  color: '#000000',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: 12,
  appearance: 'none',
  WebkitAppearance: 'none',
};

export function AddExpense({ onClose }: AddExpenseProps) {
  const { addExpense, categories: rawCategories } = useExpenses();

  // Deduplicate by name — guards against duplicate DB entries (unique IDs, same name)
  const seenNames = new Set<string>();
  const categories = rawCategories.filter((c) => {
    if (seenNames.has(c.name)) return false;
    seenNames.add(c.name);
    return true;
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const [amount, setAmount]           = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate]               = useState(today);
  const [visible, setVisible]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef   = useRef<HTMLDivElement>(null);
  const startY     = useRef(0);

  useEffect(() => {
    if (categories && categories.length > 0 && !categoryId) {
      const sorted = [...categories].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      setCategoryId(sorted[0].id!);
    }
  }, [categories]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Bloque le scroll de l'arrière-plan pendant que le sheet est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Bloque touchmove sur l'overlay (listener non-passif requis pour preventDefault)
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      // Laisse le scroll interne du sheet fonctionner, bloque tout le reste
      if (sheetRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  // Swipe vers le bas sur la drag handle → fermeture
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - startY.current;
    if (deltaY > 80) handleClose();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !categoryId || submitting) return;
    setSubmitting(true);
    try {
      await addExpense({
        amount: parseFloat(amount.replace(',', '.')),
        categoryId,
        description,
        date,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Sheet — flex colonne : header fixe | contenu scrollable | bouton fixe */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)',
          borderRadius: '20px 20px 0 0',
          backgroundColor: 'white',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          fontFamily: font,
          zIndex: 101,
        }}
      >
        {/* Drag handle — swipe ici pour fermer */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'grab', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D1D6' }} />
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 17, fontWeight: 600, textAlign: 'center',
          color: '#000000', margin: '0 0 24px', padding: '0 20px', flexShrink: 0,
        }}>
          Nouvelle dépense
        </h2>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          {/* Zone scrollable */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>

            {/* Amount input — pas d'autoFocus, le clavier s'ouvre seulement au tap */}
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 4,
              marginBottom: 32,
            }}>
              <input
                type="text"
                inputMode="decimal"
                value={amount.replace('.', ',')}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9,]/g, '');
                  const parts = val.split(',');
                  if (parts.length > 2) return;
                  setAmount(val);
                }}
                placeholder="0"
                aria-label="Montant"
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  textAlign: 'center',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: 200,
                  color: '#000000',
                  cursor: 'text',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  fontFamily: font,
                }}
              />
              <span style={{ fontSize: 28, fontWeight: 600, color: '#8E8E93', lineHeight: 1 }}>
                €
              </span>
            </div>

            {/* Category grid 4×2 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              maxWidth: 440,
              margin: '0 auto 24px',
            }}>
              {[...categories].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((cat: Category) => {
                const selected = categoryId === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(String(cat.id))}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <span style={{
                      width: 48, height: 48, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      backgroundColor: selected ? `${cat.color}33` : `${cat.color}1A`,
                      border: `2px solid ${selected ? '#007AFF' : 'transparent'}`,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}>
                      {cat.icon}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      color: selected ? '#007AFF' : '#8E8E93',
                      textAlign: 'center',
                      maxWidth: 56, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: font,
                    }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Description */}
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description..."
              style={inputStyle}
            />

            {/* Date */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />

          </div>{/* fin zone scrollable */}

          {/* Bouton toujours visible — en dehors de la zone scrollable */}
          <div style={{
            flexShrink: 0,
            padding: '12px 20px 16px',
            backgroundColor: 'white',
          }}>
            <button
              type="submit"
              disabled={!amount || submitting}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                backgroundColor: !amount || submitting ? '#C7C7CC' : '#007AFF',
                color: '#ffffff',
                fontSize: 17,
                fontWeight: 600,
                fontFamily: font,
                border: 'none',
                cursor: !amount || submitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {submitting ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
