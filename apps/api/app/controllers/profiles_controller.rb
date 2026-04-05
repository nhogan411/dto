class ProfilesController < ApplicationController
  before_action :authenticate_user!

  def update
    current_user.email = profile_params[:email] if profile_params.key?(:email)

    if password_change_requested?
      return render_unprocessable_entity("Current password is required") if profile_params[:current_password].blank?
      return render_unprocessable_entity("Current password is incorrect") unless current_user.authenticate(profile_params[:current_password])

      current_user.password = profile_params[:new_password]
      current_user.password_confirmation = profile_params[:new_password_confirmation]
    end

    if current_user.save
      render json: { message: "Profile updated" }
    else
      render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def profile_params
    params.require(:profile).permit(:email, :current_password, :new_password, :new_password_confirmation)
  end

  def password_change_requested?
    profile_params[:new_password].present? || profile_params[:new_password_confirmation].present?
  end
end
