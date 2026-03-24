import { getMongoDb } from "../../utils/mongodb";
import { requireAuthContext } from "../../utils/session";

export default eventHandler(async (event) => {
  const { userId, isDemo } = await requireAuthContext(event);

  if (isDemo) {
    throw createError({
      statusCode: 400,
      statusMessage: "Demo data cannot be reset from settings",
    });
  }

  const config = useRuntimeConfig();
  const db = await getMongoDb();

  const collections = [
    config.mongodbAccountsCollection,
    config.mongodbCategoriesCollection,
    config.mongodbTransactionsCollection,
    config.mongodbBudgetsCollection,
    config.mongodbBudgetUsagesCollection,
    config.mongodbNotificationsCollection,
    config.mongodbCustomersCollection,
  ];

  await Promise.all(
    collections.map((name) => db.collection(name).deleteMany({ userId })),
  );

  return {
    ok: true,
  };
});
