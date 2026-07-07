/// Default accounts:
/// - PB superuser (dashboard):  admin@northwind.local / northwind-admin-2026
/// - App login (employees):     admin / password  (role: admin)
migrate((app) => {
  // superuser for the PocketBase dashboard
  const superusers = app.findCollectionByNameOrId("_superusers");
  const su = new Record(superusers);
  su.set("email", "admin@northwind.local");
  su.set("password", "northwind-admin-2026");
  app.save(su);

  // default application admin: admin / password
  const employees = app.findCollectionByNameOrId("employees");
  const admin = new Record(employees);
  admin.set("username", "admin");
  admin.set("email", "admin@northwind.raawww.com");
  admin.set("password", "password");
  admin.set("verified", true);
  admin.set("first_name", "System");
  admin.set("last_name", "Administrator");
  admin.set("job_title", "Administrator");
  admin.set("role", "admin");
  admin.set("active", true);
  admin.set("language", "en");
  app.save(admin);
}, (app) => {
  try {
    app.delete(app.findAuthRecordByEmail("_superusers", "admin@northwind.local"));
  } catch {}
  try {
    const rec = app.findFirstRecordByData("employees", "username", "admin");
    app.delete(rec);
  } catch {}
});
