module Admin
  class BaseController < ApplicationController
    include JwtAuthenticatable

    before_action :authenticate_user!
    before_action :require_admin!

    private

    def require_admin!
      return if current_user&.admin?

      render json: { errors: [ "Forbidden" ] }, status: :forbidden
    end
  end
end
