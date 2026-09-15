# `tn clean` — limpieza de simuladores iOS

Fecha: 2026-07-30
Estado: aprobado, pendiente de implementación

## Problema

Xcode no limpia detrás de sí. Cuando se desinstala un runtime, sus simuladores
quedan en `~/Library/Developer/CoreSimulator/Devices` como "fantasmas": siguen
en `simctl list` pero con `isAvailable: false` y `availabilityError: "runtime
profile not found"`. Nunca se borran solos.

Medido en la máquina de referencia (2026-07-30) tras desinstalarse el runtime
iOS 26.4:

| Concepto | Espacio |
| --- | --- |
| 11 simuladores fantasma de iOS 26.4 | 14 GB |
| `~/Library/Developer/CoreSimulator/Devices` (total) | 43 GB |
| Imágenes de runtime (iOS 18.6 + 26.5) | 16.1 GB |

Además, esos fantasmas ensuciaban `tn generate`: `ti info` los reporta como si
existieran, así que TiNy generaba recetas para ellos que la poda de huérfanas
borraba acto seguido, en un bucle infinito. Ese defecto se corrige por separado
(filtrado por `simctl` en la generación); `tn clean` ataca la causa de raíz,
que es la basura en disco.

## Alcance

Dentro:

- Borrar simuladores iOS fantasma.
- Borrar contenidos y ajustes de simuladores vivos (`--data`).
- Borrar imágenes de runtime iOS (`--runtimes`).
- Podar las recetas de TiNy que queden huérfanas por cualquiera de esas
  operaciones.

Fuera:

- Emuladores de Android. `avdmanager` es otro modelo y no ofrece un equivalente
  a `delete unavailable`. Queda para una versión posterior si hace falta.
- watchOS, tvOS y visionOS como caso a tratar aparte. `simctl delete unavailable`
  no distingue plataforma, así que si hay fantasmas de esas se listan y se
  borran junto con los de iOS: la lista muestra exactamente lo que se va a
  borrar, agrupada por runtime.

## Superficie del comando

```
tn clean                    # solo fantasmas
tn clean --ghosts           # idéntico, explícito, para combinar
tn clean --data             # erase de simuladores disponibles
tn clean --runtimes         # borrar imágenes de runtime, eligiendo cuáles
tn clean --data --runtimes  # se combinan
```

Reglas de la superficie:

1. Sin banderas equivale a `--ghosts`. Es el caso seguro y el habitual.
2. Con banderas se hace **solo** lo pedido. `tn clean --data` no barre fantasmas
   de pasada. Nada implícito.
3. No existe `--all`. Borrar 30 GB no debe caber en un tab-complete distraído.
4. Toda operación se confirma mostrando qué se borra y cuánto espacio libera,
   con el prompt en `No` por defecto, igual que la poda de recetas huérfanas.

## Primitivas de `simctl`

Verificadas en Xcode con runtimes iOS 18.6 y 26.5 instalados:

| Operación | Comando | Notas |
| --- | --- | --- |
| Listar dispositivos | `xcrun simctl list devices --json` | trae `isAvailable`, `state`, `dataPath` |
| Borrar fantasmas | `xcrun simctl delete unavailable` | "delete devices that are not supported by the current Xcode SDK" |
| Borrar datos | `xcrun simctl erase <udid> [...]` | conserva el simulador |
| Listar runtimes | `xcrun simctl runtime list --json` | trae `sizeBytes`, `lastUsedAt`, `deletable`, `version` |
| Borrar runtime | `xcrun simctl runtime delete <identifier>` | acepta varios identificadores |

El tamaño de los simuladores no lo da `simctl`; se calcula con `du -sk` sobre el
directorio padre de `dataPath`. Medido: ~4.5 s para 11 simuladores. Se muestra
un aviso mientras se calcula.

## Arquitectura

Módulo nuevo `lib/clean.js`, en la línea de `lib/setup.js`: expone una función
por operación más el orquestador que `bin/cli.js` invoca.

```
bin/cli.js
  └── cmd === 'clean' → clean.run(flags)

lib/clean.js
  ├── run(flags)                    orquesta según banderas, en orden seguro
  ├── listGhosts()                  → [{ udid, name, runtime, path }]
  ├── listLiveSimulators()          → [{ udid, name, state }]
  ├── listRuntimes()                → [{ id, name, version, sizeBytes, lastUsedAt }]
  ├── cleanGhosts()                 confirma y ejecuta `delete unavailable`
  ├── cleanData()                   confirma y ejecuta `erase`
  ├── cleanRuntimes()               elige cuáles, confirma y ejecuta `runtime delete`
  └── dirSize(paths)                `du -sk`, para reportar espacio

lib/simctl.js
  └── envoltorio único de `xcrun simctl ... --json` con manejo de fallo

lib/setup.js
  └── pruneOrphanRecipes(iosSet, androidSet)   extraído del bloque actual de
      generate() para que clean.js lo reutilice
```

`lib/setup.js` ya consulta `simctl` para saber qué simuladores están activos.
Esa llamada se traslada a `lib/simctl.js` y ambos módulos la consumen, en vez de
duplicarla. Es el único refactor de código existente que contempla este diseño.

## Flujo por bandera

### `--ghosts` (por defecto)

1. Leer `simctl list devices --json`, quedarse con `isAvailable === false`.
2. Si no hay ninguno: `No ghost simulators found.` y terminar.
3. Calcular tamaño en disco y listar los fantasmas agrupados por runtime.
4. Confirmar. Si acepta, ejecutar `simctl delete unavailable`.
5. Podar recetas huérfanas (ver más abajo).

### `--data`

1. Listar simuladores con `isAvailable === true`.
2. **Omitir los que estén en estado `Booted`**, avisando cuáles y por qué. Es
   determinista y evita depender de si `erase` acepta o no ese estado.
3. Calcular tamaño y confirmar.
4. Ejecutar `simctl erase <udid> ...` con la lista explícita de UDIDs. No se usa
   `erase all`, para no tocar lo omitido en el paso 2.
5. No hay poda de recetas: los simuladores siguen existiendo.

### `--runtimes`

1. Leer `simctl runtime list --json`, descartar los que traigan
   `deletable: false`.
2. Presentar cada runtime con versión, tamaño y fecha de último uso, y dejar
   elegir cuáles borrar con un `checkbox` de `@inquirer/prompts`. Ninguno viene
   preseleccionado.
3. Si se elige el runtime más nuevo instalado, advertirlo de forma explícita
   antes de la confirmación final.
4. Confirmar y ejecutar `simctl runtime delete <id> ...`.
5. Borrar un runtime convierte sus simuladores en fantasmas. Encadenar de
   inmediato el barrido de fantasmas, sin volver a preguntar: ya se confirmó el
   borrado del runtime del que dependen. `simctl delete unavailable` no
   discrimina, así que si había fantasmas previos también caen; el resumen los
   cuenta por separado en vez de atribuirlos todos al runtime recién borrado.
6. Podar recetas huérfanas.

### Orden cuando se combinan banderas

`--data` → `--runtimes` → `--ghosts`. Los runtimes van antes que los fantasmas
porque generan fantasmas nuevos, y así una sola pasada final los recoge todos.

## Poda de recetas

Tras borrar simuladores, las recetas de usuario que apuntaban a ellos quedan
colgando. `clean` reutiliza `pruneOrphanRecipes()`, el mismo código que usa
`tn generate`: releer `simctl` ya sin lo borrado, comparar contra `~/.tn.json`,
listar las huérfanas y ofrecer quitarlas con el prompt en `No`.

Es una confirmación aparte de la del borrado en disco. Son dos decisiones
distintas y el usuario puede querer conservar los nombres de sus recetas.

## Integración con `tn generate`

`generate` **no** borra nada ni pregunta nada nuevo. Si detecta fantasmas,
imprime una sola línea informativa:

```
[WARN]  11 ghost simulators found — their runtime is no longer installed
        Run  tn clean  to remove them and free up disk space.
```

Va como `warn`, no como `info`: en una columna de mensajes idénticos la línea
se perdía. La etiqueta amarilla y el renglón aparte para el comando la separan
del resto.

Sin esta línea el usuario nunca se enteraría, porque tras el arreglo del bucle
`generate` ignora los fantasmas por completo.

`generate` informa el conteo pero **no** el tamaño: el `du` cuesta ~4.5 s y no
se justifica en cada corrida. El tamaño se calcula en `tn clean`, donde sí es
la decisión que se está tomando.

## Manejo de errores

- **`xcrun` no existe o falla** (no hay Xcode, no es macOS): mensaje claro
  (`tn clean requires Xcode command line tools on macOS`) y salida sin error de
  ejecución. Mismo criterio que ya usa `getActiveIosUdidsFromSimctl`, que
  devuelve `null` ante cualquier fallo.
- **JSON ilegible**: se trata como fallo de la consulta; no se borra nada.
- **Un borrado falla** (permisos, simulador en uso): se reporta el fallo con lo
  que devolvió `simctl` y se continúa con los demás. Al final se resume qué se
  borró y qué no.
- **El usuario cancela el prompt** (Ctrl+C): salir limpio, sin traza de
  `ExitPromptError`.

## Verificación

El proyecto no tiene framework de pruebas, así que la verificación es manual y
con criterios comprobables antes de dar nada por terminado:

| Escenario | Comprobación |
| --- | --- |
| Hay fantasmas | `tn clean` los lista con su tamaño; al aceptar, `simctl list devices --json` ya no reporta ninguno con `isAvailable:false` |
| No hay fantasmas | `tn clean` dice `No ghost simulators found.` y no invoca `delete` |
| Se responde que No | `~/.tn.json` y `simctl list` quedan idénticos (comparación byte a byte contra copia previa) |
| `--runtimes` | `simctl runtime list` pierde el elegido; los fantasmas que genera se barren en la misma corrida |
| `--data` con un simulador booteado | ese simulador se omite y se avisa; los demás quedan con `erase` aplicado |
| Sin Xcode | mensaje claro, sin traza de excepción |
| Recetas huérfanas | tras borrar, se ofrecen las afectadas y solo esas |

Cada corrida de verificación se hace con copia previa de `~/.tn.json` para poder
comparar y restaurar.

## Decisiones tomadas

- **Tres banderas, no un solo comando que lo haga todo.** Son tres problemas con
  tres perfiles de riesgo distintos: los fantasmas no sirven para nada, los
  datos se reinstalan, y un runtime borrado son varios GB de descarga.
- **Sin `--all`.** Combinar banderas a propósito es un acto deliberado; `--all`
  no lo es.
- **`--runtimes` encadena la limpieza de fantasmas.** Es lo que aporta TiNy
  sobre `simctl` pelón: TiNy sabe de recetas, `simctl` no.
- **Android fuera.** Sin equivalente limpio a `delete unavailable`.
- **Sin `--dry-run` propio.** El prompt en `No` mostrando la lista completa ya
  cumple esa función; añadir una bandera para lo mismo sobra.
