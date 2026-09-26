import type { Metadata } from 'next'
import { PaginaLegal } from '@/components/landing/PaginaLegal'
import { PRECIO_MENSUAL, PRECIO_LIFETIME_USD, money, usd, linkWhatsApp } from '@/components/landing/precios'

export const metadata: Metadata = {
  title: 'Términos y condiciones · Stackr',
  description: 'Las condiciones de uso de Stackr: planes, pagos, datos, soporte y responsabilidades.',
}

export default function TerminosPage() {
  return (
    <PaginaLegal titulo="Términos y condiciones" actualizado="26 de septiembre de 2026">
      <p>
        Estos términos regulan el uso de Stackr, el sistema de gestión para locales de celulares y servicio técnico.
        Al crear una cuenta o usar el sistema, el titular acepta estas condiciones.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Stackr se ofrece como servicio en línea: se usa desde el navegador, sin instalar nada. Stackr otorga al negocio
        titular una licencia de uso no exclusiva e intransferible. El software, su código y su marca siguen siendo de su
        autor.
      </p>

      <h2>2. Prueba gratuita</h2>
      <p>Cada negocio nuevo tiene 48 horas de prueba gratuita, sin tarjeta. Al terminar, elige un plan para seguir usándolo.</p>

      <h2>3. Planes y pagos</h2>
      <ul>
        <li>
          <strong>Mensual:</strong> {money(PRECIO_MENSUAL)} por mes, sin permanencia. Se puede dar de baja en cualquier
          momento.
        </li>
        <li>
          <strong>Licencia de por vida:</strong> {usd(PRECIO_LIFETIME_USD)} en un único pago. No vence ni requiere pagos
          adicionales mientras Stackr se mantenga en funcionamiento como servicio. Si el servicio se discontinuara, se
          avisará al titular con al menos 90 días de anticipación y podrá descargar la totalidad de sus datos.
        </li>
      </ul>
      <p>
        Los dos planes incluyen el sistema completo: sucursales y usuarios ilimitados, todas las funciones, las
        actualizaciones y el soporte por WhatsApp. Los precios pueden cambiar para nuevas contrataciones; una licencia de
        por vida ya pagada no cambia.
      </p>

      <h2>4. Vencimientos</h2>
      <p>
        Si una suscripción mensual se vence, la cuenta sigue funcionando normalmente durante 10 días de gracia. Después
        pasa a sólo lectura: se puede consultar y descargar toda la información, pero no cargar datos nuevos hasta
        renovar.
      </p>

      <h2>5. Alcance y uso adecuado</h2>
      <p>
        La cuenta es del negocio titular. No puede cederse, revenderse ni compartirse con otro negocio o razón social.
        No está permitido copiar, descompilar o modificar el software, intentar acceder a datos de otros negocios ni usar
        el sistema con fines ilícitos. El incumplimiento habilita la suspensión de la cuenta.
      </p>

      <h2>6. Tus datos</h2>
      <p>
        La información que cargás pertenece al titular, que puede descargar un respaldo completo cuando lo desee. Stackr
        la trata de forma confidencial, no la vende ni la comparte con terceros, y sólo accede a ella para brindar
        soporte a pedido del titular. Ver la <a href="/privacidad">Política de privacidad</a>.
      </p>

      <h2>7. Soporte</h2>
      <p>
        El soporte se brinda por <a href={linkWhatsApp('mensual')}>WhatsApp</a> en días hábiles, con respuesta dentro de
        las 24 horas hábiles. Los problemas que impiden operar se atienden en el día.
      </p>

      <h2>8. Responsabilidad</h2>
      <p>
        El servicio se presta con la mayor diligencia razonable. Stackr no responde por interrupciones ajenas a su
        control (conectividad, proveedores de infraestructura), por el uso indebido de las credenciales de acceso ni por
        decisiones comerciales tomadas a partir de la información cargada. En ningún caso la responsabilidad superará el
        monto abonado por el titular en los últimos 12 meses o, en el caso de la licencia de por vida, el monto abonado
        por la licencia.
      </p>

      <h2>9. Cambios en los términos</h2>
      <p>Si modificamos estos términos, publicamos la nueva versión en esta página y avisamos a los titulares de cuentas activas.</p>

      <h2>10. Ley aplicable y jurisdicción</h2>
      <p>
        Estas condiciones se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se
        someten a los tribunales ordinarios del Departamento Judicial de Necochea, provincia de Buenos Aires.
      </p>
    </PaginaLegal>
  )
}
