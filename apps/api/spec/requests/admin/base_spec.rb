require "rails_helper"

RSpec.describe "Admin::BaseController", type: :request do
  describe "require_admin! guard" do
    # Test via a concrete admin endpoint (to be implemented in T13-T15)
    # This spec documents the behavior that all admin endpoints must enforce

    describe "authentication and authorization enforcement" do
      context "without authentication token" do
        it "returns 401 Unauthorized" do
          # Placeholder: once an actual admin endpoint exists, test it here
          # Example: get "/admin/users"
          # expect(response).to have_http_status(:unauthorized)
          # expect(JSON.parse(response.body)).to eq({ "errors" => ["Unauthorized"] })
        end
      end

      context "with authenticated non-admin user" do
        it "returns 403 Forbidden" do
          # Placeholder: once an actual admin endpoint exists, test it here
          # user = create(:user, :player)
          # access_token = JsonWebToken.encode(user_id: user.id)
          # get "/admin/users", headers: { "Authorization" => "Bearer #{access_token}" }
          # expect(response).to have_http_status(:forbidden)
          # expect(JSON.parse(response.body)).to eq({ "errors" => ["Forbidden"] })
        end
      end

      context "with authenticated admin user" do
        it "allows access (behavior verified in T13-T15 specs)" do
          # Placeholder: once actual admin endpoints exist, verify they work for admins
          # admin = create(:user, :admin)
          # access_token = JsonWebToken.encode(user_id: admin.id)
          # get "/admin/users", headers: { "Authorization" => "Bearer #{access_token}" }
          # expect(response).to have_http_status(:ok) # or appropriate status for the endpoint
        end
      end
    end
  end
end
