"use client";

import Link from "next/link";
import { guardarConfiguracion } from "@/app/actions/configuracion";
import { cambiarMiClave, crearPrimerAdmin, iniciarSesionAccion } from "@/app/actions/sesion";
import { guardarUsuario } from "@/app/actions/usuarios";
import { btnPrimario, btnSecundario, inputCls } from "./estilos";
import { Aviso, Campo, Tarjeta } from "./ui";
import { useFormAccion } from "./useFormAccion";

// Formularios de inicio de sesión, usuarios y configuración.

export function FormLogin({ siguiente }: { siguiente?: string }) {
  const { estado, onSubmit, pendiente } = useFormAccion(iniciarSesionAccion);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      <Campo label="Usuario" htmlFor="usuario">
        <input id="usuario" name="usuario" autoComplete="username" autoCapitalize="none" autoFocus required className={inputCls} />
      </Campo>
      <Campo label="Contraseña" htmlFor="clave">
        <input id="clave" name="clave" type="password" autoComplete="current-password" required className={inputCls} />
      </Campo>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button type="submit" disabled={pendiente} className={`${btnPrimario} w-full !py-2.5`}>
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export function FormPrimerAdmin() {
  const { estado, onSubmit, pendiente } = useFormAccion(crearPrimerAdmin);
  const c = estado.campos ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Campo label="Tu nombre" htmlFor="nombre" error={c.nombre} requerido>
        <input id="nombre" name="nombre" autoFocus required className={inputCls} placeholder="Ej.: Ana Pérez" />
      </Campo>
      <Campo label="Usuario para entrar" htmlFor="usuario" error={c.usuario} ayuda="Sin espacios. Ej.: ana" requerido>
        <input id="usuario" name="usuario" autoComplete="username" autoCapitalize="none" required className={inputCls} />
      </Campo>
      <Campo label="Contraseña" htmlFor="clave" error={c.clave} ayuda="Al menos 6 caracteres." requerido>
        <input id="clave" name="clave" type="password" autoComplete="new-password" required className={inputCls} />
      </Campo>
      <Campo label="Repite la contraseña" htmlFor="clave2" error={c.clave2} requerido>
        <input id="clave2" name="clave2" type="password" autoComplete="new-password" required className={inputCls} />
      </Campo>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <button type="submit" disabled={pendiente} className={`${btnPrimario} w-full !py-2.5`}>
        {pendiente ? "Creando…" : "Crear administrador y entrar"}
      </button>
    </form>
  );
}

export function FormMiClave() {
  const { estado, onSubmit, pendiente } = useFormAccion(cambiarMiClave);
  const c = estado.campos ?? {};
  return (
    <form onSubmit={onSubmit} key={estado.ok} className="space-y-4 p-4">
      <Campo label="Contraseña actual" htmlFor="actual" error={c.actual}>
        <input id="actual" name="actual" type="password" autoComplete="current-password" required className={inputCls} />
      </Campo>
      <Campo label="Nueva contraseña" htmlFor="nueva" error={c.nueva} ayuda="Al menos 6 caracteres.">
        <input id="nueva" name="nueva" type="password" autoComplete="new-password" required className={inputCls} />
      </Campo>
      <Campo label="Repite la nueva contraseña" htmlFor="nueva2" error={c.nueva2}>
        <input id="nueva2" name="nueva2" type="password" autoComplete="new-password" required className={inputCls} />
      </Campo>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
      <button type="submit" disabled={pendiente} className={btnPrimario}>
        {pendiente ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

export type DatosUsuario = { id: number; nombre: string; usuario: string; rol: "admin" | "vendedor"; activo: number };

export function FormUsuario({
  usuario,
  roles,
  esYo,
}: {
  usuario?: DatosUsuario;
  roles: { valor: string; texto: string; descripcion: string }[];
  esYo?: boolean;
}) {
  const { estado, onSubmit, pendiente } = useFormAccion(guardarUsuario);
  const c = estado.campos ?? {};
  const u = usuario;
  return (
    <form onSubmit={onSubmit}>
      {u && <input type="hidden" name="id" value={u.id} />}
      <Tarjeta>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo label="Nombre" htmlFor="nombre" error={c.nombre} requerido>
            <input id="nombre" name="nombre" defaultValue={u?.nombre} required className={inputCls} />
          </Campo>
          <Campo label="Usuario para entrar" htmlFor="usuario" error={c.usuario} ayuda="Sin espacios." requerido>
            <input id="usuario" name="usuario" defaultValue={u?.usuario} autoCapitalize="none" required className={inputCls} />
          </Campo>
          <Campo
            label={u ? "Nueva contraseña" : "Contraseña"}
            htmlFor="clave"
            error={c.clave}
            ayuda={u ? "Déjala vacía para no cambiarla." : "Al menos 6 caracteres. Entrégasela a la persona."}
            requerido={!u}
          >
            <input id="clave" name="clave" type="password" autoComplete="new-password" required={!u} className={inputCls} />
          </Campo>
          {u && (
            <Campo label="Estado" htmlFor="activo" ayuda={esYo ? "No puedes desactivar tu propio usuario." : undefined}>
              <select id="activo" name="activo" defaultValue={u.activo ? "1" : "0"} disabled={esYo} className={inputCls}>
                <option value="1">Activo</option>
                <option value="0">Desactivado (no puede entrar)</option>
              </select>
              {esYo && <input type="hidden" name="activo" value="1" />}
            </Campo>
          )}
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-sm font-medium text-gris-700">Rol</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {roles.map((r) => (
                <label key={r.valor} className="flex cursor-pointer gap-2 rounded-lg border border-gris-200 p-3 text-sm has-[:checked]:border-acento-600 has-[:checked]:bg-acento-50/50">
                  <input type="radio" name="rol" value={r.valor} defaultChecked={(u?.rol ?? "vendedor") === r.valor} className="mt-0.5 accent-acento-700" />
                  <span>
                    <span className="block font-medium text-gris-900">{r.texto}</span>
                    <span className="block text-gris-500">{r.descripcion}</span>
                  </span>
                </label>
              ))}
            </div>
            {c.rol && <p className="mt-1 text-xs text-red-600">{c.rol}</p>}
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gris-100 px-5 py-3">
          {estado.error && (
            <div className="mr-auto">
              <Aviso tipo="error">{estado.error}</Aviso>
            </div>
          )}
          <Link href="/usuarios" className={btnSecundario}>
            Cancelar
          </Link>
          <button type="submit" disabled={pendiente} className={btnPrimario}>
            {pendiente ? "Guardando…" : u ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </Tarjeta>
    </form>
  );
}

export function FormConfiguracion({
  negocio,
}: {
  negocio: { nombre: string; direccion: string; telefono: string; nit: string; mensajeTicket: string };
}) {
  const { estado, onSubmit, pendiente } = useFormAccion(guardarConfiguracion);
  const c = estado.campos ?? {};
  return (
    <form onSubmit={onSubmit}>
      <Tarjeta titulo="Datos del negocio" className="max-w-3xl">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo label="Nombre del negocio" htmlFor="nombre" error={c.nombre} requerido className="sm:col-span-2" ayuda="Aparece en el menú, los tickets y los reportes.">
            <input id="nombre" name="nombre" defaultValue={negocio.nombre} required maxLength={60} className={inputCls} />
          </Campo>
          <Campo label="Dirección" htmlFor="direccion" className="sm:col-span-2">
            <input id="direccion" name="direccion" defaultValue={negocio.direccion} maxLength={120} className={inputCls} />
          </Campo>
          <Campo label="Teléfono / WhatsApp" htmlFor="telefono">
            <input id="telefono" name="telefono" defaultValue={negocio.telefono} maxLength={60} className={inputCls} />
          </Campo>
          <Campo label="NIT" htmlFor="nit" ayuda="Opcional.">
            <input id="nit" name="nit" defaultValue={negocio.nit} maxLength={40} className={inputCls} />
          </Campo>
          <Campo label="Mensaje al pie del ticket" htmlFor="mensajeTicket" className="sm:col-span-2">
            <input id="mensajeTicket" name="mensajeTicket" defaultValue={negocio.mensajeTicket} maxLength={200} className={inputCls} />
          </Campo>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gris-100 px-5 py-3">
          {estado.error && (
            <div className="mr-auto">
              <Aviso tipo="error">{estado.error}</Aviso>
            </div>
          )}
          {estado.ok && (
            <div className="mr-auto">
              <Aviso tipo="ok">{estado.ok}</Aviso>
            </div>
          )}
          <button type="submit" disabled={pendiente} className={btnPrimario}>
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </Tarjeta>
    </form>
  );
}
