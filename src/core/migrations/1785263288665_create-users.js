exports.up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    name: {
      type: 'varchar(500)',
      default: null,
    },

    email: {
      type: 'varchar(254)',
      notNull: true,
      unique: true,
    },

    password: {
      type: 'varchar(60)',
      default: null,
    },

    features: {
      type: 'varchar[]',
      notNull: true,
      default: '{}',
    },

    provider: {
      type: 'varchar(50)',
      notNull: true,
      default: 'local',
    },

    provider_id: {
      type: 'varchar(255)',
      default: null,
    },

    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
