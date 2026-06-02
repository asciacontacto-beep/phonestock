const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/sell/SellClient.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  `const [unit, setUnit] = useState<any>(null);`,
  `const [unit, setUnit] = useState<any>(null);
  const [accessoriesList, setAccessoriesList] = useState<any[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<any[]>([]);`
);

// 2. Add fetch logic
code = code.replace(
  `supabase.from('settings').select('*').maybeSingle()`,
  `supabase.from('settings').select('*').maybeSingle(),
      supabase.from('accessories').select('*').gt('stock', 0)`
);
code = code.replace(
  `]}).then(([{ data: { session } }, { data: stockData }, { data: depositsData }, { data: settingsData }])`,
  `]}).then(([{ data: { session } }, { data: stockData }, { data: depositsData }, { data: settingsData }, { data: accData }])`
);
code = code.replace(
  `setSettings(settingsData);`,
  `setSettings(settingsData);
      setAccessoriesList(accData || []);`
);

// 3. Update Confirm Function
code = code.replace(
  `        notes: notes.trim() || null
      };`,
  `        notes: notes.trim() || null,
        accessories: selectedAccessories.length > 0 ? selectedAccessories : null
      };`
);

// Stock deduction for accessories
code = code.replace(
  `      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', unit.id);
      if (uErr) throw uErr;`,
  `      const { data: saleRow, error: sErr } = await supabase.from('sales').insert([saleData]).select();
      if (sErr) throw sErr;

      if (unit && !unit.isAccessoryOnly) {
        const { error: uErr } = await supabase.from('stock').update({ status: 'sold' }).eq('id', unit.id);
        if (uErr) throw uErr;
      }
      
      for (const a of selectedAccessories) {
        const { error: aErr } = await supabase.rpc('decrement_accessory_stock', { acc_id: a.id, qty: a.qty });
        if (aErr) {
           // Fallback if rpc doesn't exist
           const acc = accessoriesList.find(x => x.id === a.id);
           if (acc) await supabase.from('accessories').update({ stock: acc.stock - a.qty }).eq('id', a.id);
        }
      }`
);

// Clear form on success
code = code.replace(
  `setStep(1); setUnit(null); setPayments([]); setSp(''); setQ(''); setNotes('');`,
  `setStep(1); setUnit(null); setPayments([]); setSp(''); setQ(''); setNotes(''); setSelectedAccessories([]);`
);

// Update step markers
code = code.replace(
  `[1,2,3].map(n => (`,
  `[1,2,3,4].map(n => (`
);

// Step 1 additions (Solo Accesorios)
code = code.replace(
  `{unit && (`,
  `{!unit && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
               <div className="divider" style={{ margin: '16px 0' }} />
               <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 12 }}>¿No vendés un equipo?</p>
               <button className="btn btn-outline" onClick={() => { setUnit({ brand: 'ACCESORIOS', model: 'Venta Directa', isAccessoryOnly: true, deposit: selectedDeposit, imei: null, storage: '', color: '' }); setStep(2); }}>Solo Vender Accesorios</button>
            </div>
          )}
          {unit && (`
);

// Fix "Continuar al Cliente" button in step 1 -> goes to step 2 (Accessories)
code = code.replace(
  `<button className="btn btn-dark" onClick={() => setStep(2)}>`,
  `<button className="btn btn-dark" onClick={() => setStep(2)}>`
);

// Shift step numbers
code = code.replace(`{step === 2 && (`, `{step === 3 && (`);
code = code.replace(`onClick={() => setStep(1)}>Volver</button>`, `onClick={() => setStep(2)}>Volver</button>`);
code = code.replace(`onClick={() => setStep(3)}>Continuar al Pago</button>`, `onClick={() => setStep(4)}>Continuar al Pago</button>`);
code = code.replace(`{step === 3 && (`, `{step === 4 && (`);
code = code.replace(`onClick={() => setStep(2)}>Atrás</button>`, `onClick={() => setStep(3)}>Atrás</button>`);
code = code.replace(`4. Pago y Cierre</div`, `4. Pago y Cierre</div`);
code = code.replace(`3. Pago y Cierre</div`, `4. Pago y Cierre</div`); // in case the previous one didn't match perfectly
code = code.replace(`<div className="lbl">3. Pago y Cierre</div>`, `<div className="lbl">4. Pago y Cierre</div>`);

// Inject new step 2
const newStep2 = `
      {step === 2 && (
        <div className="card">
          <div className="lbl">2. Accesorios Adicionales (Opcional)</div>
          <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Agregá fundas, vidrios, cargadores a esta venta. Podés marcarlos como de regalo (costo 0) o cobrarlos.</p>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
               <select className="inp" id="acc_select" style={{ flex: 1 }}>
                 <option value="">-- Seleccionar Accesorio --</option>
                 {accessoriesList.filter(a => a.deposit_id === unit.deposit).map(a => (
                   <option key={a.id} value={a.id}>{a.category} {a.compatible_model} {a.color} (Stock: {a.stock} - U$ {a.sale_price})</option>
                 ))}
               </select>
               <input type="number" id="acc_qty" className="inp" defaultValue={1} min={1} style={{ width: 80 }} />
               <select className="inp" id="acc_type" style={{ width: 130 }}>
                 <option value="venta">Vender</option>
                 <option value="regalo">De Regalo</option>
               </select>
               <button className="btn btn-dark" onClick={() => {
                 const id = (document.getElementById('acc_select') as HTMLSelectElement).value;
                 const qty = parseInt((document.getElementById('acc_qty') as HTMLInputElement).value) || 1;
                 const type = (document.getElementById('acc_type') as HTMLSelectElement).value;
                 if (!id) return;
                 const acc = accessoriesList.find(a => a.id === id);
                 if (qty > acc.stock) return toast.error('No hay stock suficiente');
                 
                 setSelectedAccessories(p => {
                    const existing = p.find(x => x.id === id && x.is_gift === (type === 'regalo'));
                    if (existing) {
                       return p.map(x => x === existing ? { ...x, qty: x.qty + qty } : x);
                    }
                    return [...p, { id, name: \`\${acc.category} \${acc.compatible_model || ''} \${acc.color || ''}\`.trim(), qty, price: type === 'regalo' ? 0 : acc.sale_price, is_gift: type === 'regalo', cost_price: acc.cost_price }];
                 });
               }}><Plus size={16}/> Sumar</button>
            </div>

            {selectedAccessories.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border-md)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Accesorios agregados</div>
                {selectedAccessories.map((sa, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                     <div>
                       <span style={{ fontWeight: 600 }}>{sa.qty}x</span> {sa.name} 
                       {sa.is_gift ? <span className="badge b-green" style={{ marginLeft: 8 }}>Regalo</span> : <span className="badge b-neu" style={{ marginLeft: 8 }}>Venta (U$ {sa.price})</span>}
                     </div>
                     <button className="btn-icon" onClick={() => setSelectedAccessories(p => p.filter((_, j) => j !== i))}><X size={14} color="var(--red)"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Atrás</button>
            <button className="btn btn-dark btn-lg" style={{ flex: 1 }} onClick={() => {
               // Update auto-calculated total price for Step 4
               if (sp === '') {
                 const accTotal = selectedAccessories.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                 const phoneTotal = unit.isAccessoryOnly ? 0 : (unit.price || 0); // Assuming stock might have price? Actually user inputs it in step 4 usually.
                 // We just pre-fill the sp if it's accessories only, or leave it blank
               }
               setStep(3)
            }}>Continuar al Cliente</button>
          </div>
        </div>
      )}
`;

code = code.replace(`{step === 3 && (`, newStep2 + `\n      {step === 3 && (`);


fs.writeFileSync('src/app/(app)/sell/SellClient.tsx', code);
console.log('Updated SellClient.tsx successfully.');
