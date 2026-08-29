import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/** Message d'erreur lisible en français, sans jargon technique. */
function messageErreur(erreur: any): string {
  const premier = erreur?.issues?.[0];
  if (!premier) return 'Requête invalide.';
  const champ = premier.path?.join('.') || 'requête';
  return `Champ « ${champ} » invalide : ${premier.message}`;
}

/**
 * Valide et normalise une partie de la requête avec un schéma Zod.
 * En cas d'échec : 400 avec un message explicite (jamais un 500).
 */
export function valider(schema: ZodType<any>, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const resultat = schema.safeParse(req[source]);

    if (!resultat.success) {
      return res.status(400).json({ error: messageErreur(resultat.error) });
    }

    // `req.query` et `req.params` sont en lecture seule sur Express 5 :
    // on stocke la version validée à part plutôt que de réassigner.
    if (source === 'body') {
      req.body = resultat.data;
    } else {
      (req as any).validated = { ...(req as any).validated, [source]: resultat.data };
    }

    next();
  };
}

/** Récupère une valeur validée pour query/params. */
export function valide<T = any>(req: Request, source: Source): T {
  return ((req as any).validated?.[source] ?? req[source]) as T;
}
