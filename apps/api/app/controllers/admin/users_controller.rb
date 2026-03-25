module Admin
  class UsersController < Admin::BaseController
    before_action :set_user, only: [ :show, :update, :destroy ]

    # GET /admin/users
    def index
      users = User.order(created_at: :asc)
      render json: { data: users.map { |user| serialize_user(user) } }
    end

    # GET /admin/users/:id
    def show
      render json: { data: serialize_user(@user) }
    end

    # PATCH/PUT /admin/users/:id
    def update
      if @user.update(user_params)
        render json: { data: serialize_user(@user) }
      else
        render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # DELETE /admin/users/:id
    def destroy
      if params[:id].to_i == current_user.id
        render json: { errors: [ "Cannot delete your own account" ] }, status: :unprocessable_entity
        return
      end

      @user.destroy!
      head :no_content
    end

    private

    def set_user
      @user = User.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { errors: [ "Not found" ] }, status: :not_found
    end

    def user_params
      params.require(:user).permit(:email, :username, :role)
    end

    def serialize_user(user)
      user.as_json(only: [ :id, :email, :username, :role, :created_at ])
    end
  end
end
