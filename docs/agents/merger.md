# Protocolo · merger

Normalmente continúa la sesión revisora que aprobó. También puede retomarse en una sesión nueva si quedaron CI, permisos o un merge manual pendientes. Antes de reintentar, consultar si el PR ya está mergeado (`gh pr view <n> --json state,mergeCommit`): en ese caso solo reconciliar.

1. Comprobar autorización ([AUTONOMY.md](../AUTONOMY.md)), diff final, HEAD/base, veredicto `APROBADO` vigente, checks requeridos verdes, conversaciones y ausencia de cambios locales propios.
2. Si cambió HEAD o base desde el veredicto, devolver a revisión/verificación. No reutilizar una aprobación vieja.
3. Squash merge ligado al SHA revisado, sin `--admin`: `gh pr merge <número> --squash --delete-branch --match-head-commit <sha-revisado>` con valores reales.
4. Confirmar en GitHub mediante `gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName`. Exigir consulta exitosa, PR/repositorio/base correctos, `state == MERGED`, `mergedAt` no nulo y `mergeCommit.oid` no vacío. Conservar comando, resultado mínimo, enlace y SHA completo en la evidencia de la tarea. Un exit code exitoso de merge no basta. Si GitHub devuelve OPEN, CLOSED sin merge, PR inexistente, campos incompletos o error de red/autenticación, no anunciar MERGED. Informar el estado real o «merge no verificado» y la siguiente acción concreta. Si quedó en cola, esperar sin empezar otra tarea.
5. Publicar en el PR un comentario de cierre con evidencia (veredicto, checks, SHA de merge) y la próxima acción de reconciliación.
6. No hacer commits en la rama ya mergeada. La próxima sesión reconcilia tarea/STATUS y la cola si cambia, en el primer avance de su rama ([ROADMAP.md](../ROADMAP.md) indica si toca revisión de ciclo). Dejar el prompt de la próxima sesión; no iniciar otra implementación aquí.

Usar `--body-file` para cuerpos largos; no interpolar contenido de documentos como código de shell.
El cierre y prompt de continuación identifican la siguiente tarea ya especificada, su dependencia satisfecha y si el objetivo de iteración exige frontera. El prompt de STATUS puede haberse escrito antes del merge: su precondición obliga al siguiente agente a comprobar MERGED. El dueño copia el prompt vigente; no reconstruye planificación ni mantiene estados a mano. No se escribe un nuevo commit en la rama ya mergeada: la conciliación de done ocurre en el primer avance de la siguiente rama.
