require "rails_helper"

RSpec.describe "GET /admin/stats", type: :request do
  let!(:admin) { create(:user, :admin, email: "admin@example.com", username: "adminuser") }

  it "returns aggregate stats" do
    u1 = create(:user)
    u2 = create(:user)
    u3 = create(:user)   # never played
    pc1 = create(:player_character, user: u1, level: 4, archetype: "warrior")
    pc2 = create(:player_character, user: u2, level: 2, archetype: "scout")
    create(:game, challenger: u1, challenged: u2, status: :completed, winner: u1)
    create(:game, challenger: u1, challenged: u2, status: :active)
    create(:game, challenger: u2, challenged: u1, status: :forfeited)
    create(:game, challenger: u1, challenged: u2, status: :completed,
           winner: u1,
           challenger_picks: [ pc1.id ],
           challenged_picks: [ pc2.id ],
           created_at: 3.days.ago)

    access_token = JsonWebToken.encode(user_id: admin.id)
    get "/admin/stats", headers: { "Authorization" => "Bearer #{access_token}" }
    expect(response).to have_http_status(:ok)

    data = response.parsed_body["data"]
    expect(data["total_games"]).to eq(4)
    expect(data["active_games"]).to eq(1)
    expect(data["games_last_7_days"]).to eq(4)
    expect(data["forfeit_rate"]).to be_a(Float)
    expect(data["avg_games_per_user"]).to be_a(Float)
    expect(data["users_with_no_games"]).to eq(2)   # admin and u3 never played
    expect(data["avg_character_level"]).to be_a(Float)
    expect(data["avg_level_by_archetype"]).to be_a(Hash)
    expect(data["top_users_by_games"]).to be_an(Array)
    expect(data["top_winning_compositions"]).to be_an(Array)
  end
end
