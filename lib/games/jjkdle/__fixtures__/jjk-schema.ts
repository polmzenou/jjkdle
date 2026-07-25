import { JJK_ATTRIBUTES } from "@/lib/universes/jjk-attributes";
import {
  buildAttributeSchema,
  type AttributeSchema,
} from "../attribute-schema";

/**
 * FIXTURE DE TEST — schéma d'attributs JJK en mémoire.
 *
 * Construit depuis les MÊMES définitions que celles écrites en base par
 * `scripts/seed-attributes-jjk.ts` (`lib/universes/jjk-attributes.ts`) : les
 * tests portent donc sur le vrai schéma JJK, sans base de données.
 */
export const JJK_SCHEMA: AttributeSchema = buildAttributeSchema(JJK_ATTRIBUTES);
