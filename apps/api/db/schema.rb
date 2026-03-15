# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_03_15_004549) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "characters", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.bigint "user_id", null: false
    t.jsonb "position", default: {}, null: false
    t.jsonb "facing_tile", default: {}, null: false
    t.integer "current_hp", default: 10, null: false
    t.boolean "is_defending", default: false, null: false
    t.integer "max_hp", default: 10, null: false
    t.jsonb "stats", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id"], name: "index_characters_on_game_id"
    t.index ["user_id"], name: "index_characters_on_user_id"
  end

  create_table "friendships", force: :cascade do |t|
    t.integer "requester_id", null: false
    t.integer "recipient_id", null: false
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["recipient_id"], name: "index_friendships_on_recipient_id"
    t.index ["requester_id", "recipient_id"], name: "index_friendships_on_requester_id_and_recipient_id", unique: true
  end

  create_table "game_actions", force: :cascade do |t|
    t.bigint "game_id", null: false
    t.bigint "character_id", null: false
    t.integer "action_type", null: false
    t.jsonb "action_data", default: {}, null: false
    t.integer "turn_number", null: false
    t.integer "sequence_number", null: false
    t.jsonb "result_data", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["character_id"], name: "index_game_actions_on_character_id"
    t.index ["game_id", "turn_number", "sequence_number"], name: "idx_on_game_id_turn_number_sequence_number_ff3e292003"
    t.index ["game_id"], name: "index_game_actions_on_game_id"
  end

  create_table "games", force: :cascade do |t|
    t.integer "challenger_id", null: false
    t.integer "challenged_id", null: false
    t.integer "status", default: 0, null: false
    t.jsonb "board_config", default: {}, null: false
    t.integer "current_turn_user_id"
    t.integer "turn_time_limit", null: false
    t.integer "winner_id"
    t.datetime "turn_deadline"
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["challenged_id"], name: "index_games_on_challenged_id"
    t.index ["challenger_id"], name: "index_games_on_challenger_id"
    t.index ["current_turn_user_id"], name: "index_games_on_current_turn_user_id"
    t.index ["winner_id"], name: "index_games_on_winner_id"
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token"], name: "index_refresh_tokens_on_token", unique: true
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "username", null: false
    t.string "password_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "characters", "games"
  add_foreign_key "characters", "users"
  add_foreign_key "friendships", "users", column: "recipient_id"
  add_foreign_key "friendships", "users", column: "requester_id"
  add_foreign_key "game_actions", "characters"
  add_foreign_key "game_actions", "games"
  add_foreign_key "games", "users", column: "challenged_id"
  add_foreign_key "games", "users", column: "challenger_id"
  add_foreign_key "games", "users", column: "current_turn_user_id"
  add_foreign_key "games", "users", column: "winner_id"
  add_foreign_key "refresh_tokens", "users"
end
