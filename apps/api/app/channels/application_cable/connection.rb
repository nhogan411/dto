module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      payload = JsonWebToken.decode(request.params[:token])
      user = User.find_by(id: payload&.dig(:user_id))
      return user if user

      reject_unauthorized_connection
    end
  end
end
