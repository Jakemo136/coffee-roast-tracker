import { setupServer } from "msw/node";
import { schemaHandler } from "./schema-handler";

export const server = setupServer(schemaHandler);
