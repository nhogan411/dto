module JwtAuthenticatable
  extend ActiveSupport::Concern

  included do
    attr_reader :current_user
  end

  def authenticate_user!
    payload = JsonWebToken.decode(bearer_token)
    @current_user = User.find_by(id: payload&.dig(:user_id))

    return if @current_user

    render json: { errors: [ "Unauthorized" ] }, status: :unauthorized
  end

  private

  def bearer_token
    request.headers["Authorization"].to_s.split(" ").last
  end
end
