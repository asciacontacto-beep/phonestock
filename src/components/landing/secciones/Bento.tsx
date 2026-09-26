"use client"
import s from '../landing.module.css'
import SpotlightCard from '../reactbits/SpotlightCard'
import CountUp from '../reactbits/CountUp'
import { useMenosMovimiento } from '../preferencias'
import { TituloBlur } from './TituloBlur'
import { EQUIPOS } from './Dispositivos'

const LUZ = 'rgba(11, 122, 75, 0.10)' as const

/* "Lo más destacado", como en Apple: bloques grandes sin borde, cada uno
   con UNA sola cosa. Se recorre de un vistazo desde el celular. */
export function Bento() {
  const quieto = useMenosMovimiento()

  return (
    <section className={`${s.seccion} ${s.seccionAlterna}`} id="sistema">
      <div className={s.ancho}>
        <TituloBlur texto="Todo lo del local. De un vistazo." />
        <p className={s.parrafo} style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
          El stock, la plata, lo que te deben y la caja. Sin planillas, sin adivinar.
        </p>

        <div className={s.bento}>
          <SpotlightCard className={`${s.bloque} ${s.bloqueGrande}`} spotlightColor={LUZ}>
            <h3 className={s.bloqueTitulo}>Cada equipo, con nombre y apellido.</h3>
            <p className={s.bloqueTexto}>IMEI, costo, precio y estado. Cuando lo vendés, sale del stock solo.</p>
            <div className={s.inventarioGrande}>
              <div className={s.inventarioResumen}>
                <span>48 equipos en stock</span>
                <span className={s.bloqueMono}>U$ 32.400</span>
              </div>
              {EQUIPOS.map((e, i) => (
                <div className={s.inventarioFila} key={e.modelo}>
                  <div>
                    <div className={s.inventarioModelo}>{e.modelo}</div>
                    <div className={s.inventarioDetalle}>{e.detalle} · IMEI ···{3421 + i * 1137}</div>
                  </div>
                  <div className={s.inventarioDerecha}>
                    <span className={s.bloqueMono}>{e.precio}</span>
                    <span className={`${s.bloqueChip} ${e.estado === 'Disponible' ? s.bloqueChipVerde : s.bloqueChipNegro}`}>{e.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard className={`${s.bloque} ${s.bloqueNegro}`} spotlightColor="rgba(52, 199, 123, 0.14)">
            <h3 className={s.bloqueTitulo}>La ganancia real.</h3>
            <p className={s.bloqueNumero}>
              U$ <em>{quieto ? '145' : <CountUp to={145} duration={1.6} />}</em>
            </p>
            <p className={s.bloqueTexto}>Un iPhone 13: costo 400, arreglo 75, venta 620. Casi todos te dirían 220.</p>
          </SpotlightCard>

          <SpotlightCard className={s.bloque} spotlightColor={LUZ}>
            <h3 className={s.bloqueTitulo}>Quién te debe, con fecha.</h3>
            <div className={s.bloqueLista}>
              <div className={s.bloqueFila}><span>Martín G. · cuota 2/3</span><span className={s.bloqueMono}>U$ 190</span></div>
              <div className={s.bloqueFila}><span>Vence</span><span className={`${s.bloqueChip} ${s.bloqueChipNegro}`}>en 4 días</span></div>
            </div>
          </SpotlightCard>

          <SpotlightCard className={s.bloque} spotlightColor={LUZ}>
            <h3 className={s.bloqueTitulo}>La caja cierra.</h3>
            <div className={s.bloqueLista}>
              <div className={s.bloqueFila}><span>Efectivo</span><span className={s.bloqueMono}>$ 1.240.000</span></div>
              <div className={s.bloqueFila}><span>Dólares</span><span className={s.bloqueMono}>U$ 1.150</span></div>
              <div className={`${s.bloqueFila} ${s.bloqueFilaFuerte}`}><span>Diferencia</span><span>$ 0</span></div>
            </div>
          </SpotlightCard>

          <SpotlightCard className={`${s.bloque} ${s.bloqueAncho}`} spotlightColor={LUZ}>
            <h3 className={s.bloqueTitulo}>Varios locales. Sin costo extra.</h3>
            <p className={s.bloqueTexto}>Cada sucursal con su stock y sus vendedores. Pasás un equipo de una a otra y queda registrado.</p>
            <div className={s.sucursales}>
              <span className={s.sucursal}>Centro</span>
              <span className={s.sucursalFlecha}>iPhone 14 →</span>
              <span className={s.sucursal}>Güemes</span>
              <span className={s.sucursal}>Depósito</span>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  )
}
