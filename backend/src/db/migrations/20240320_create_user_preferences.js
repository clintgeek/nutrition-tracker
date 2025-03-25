exports.up = function(knex) {
  return knex.schema.createTable('user_preferences', table => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().unique()
      .references('id').inTable('users')
      .onDelete('CASCADE');
    table.jsonb('home_screen_layout').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_preferences');
};