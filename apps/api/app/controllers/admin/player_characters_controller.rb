module Admin
  class PlayerCharactersController < Admin::BaseController
    before_action :set_player_character, only: [ :show, :update, :destroy ]

    def index
      scope = PlayerCharacter.all.order(:user_id, :id)
      scope = scope.where(user_id: params[:user_id]) if params[:user_id].present?

      render json: { data: scope.map { |character| serialize_player_character(character) } }
    end

    def show
      render json: { data: serialize_player_character(@player_character) }
    end

    def create
      player_character = PlayerCharacter.new(create_params)

      if player_character.save
        render json: { data: serialize_player_character(player_character) }, status: :created
      else
        render json: { errors: player_character.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @player_character.update(update_params)
        render json: { data: serialize_player_character(@player_character) }
      else
        render json: { errors: @player_character.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @player_character.destroy
      head :no_content
    end

    private

    def set_player_character
      @player_character = PlayerCharacter.find_by(id: params[:id])
      return if @player_character

      render json: { errors: [ "Not found" ] }, status: :not_found
    end

    def create_params
      params.permit(:user_id, :name, :archetype, :locked)
    end

    def update_params
      params.permit(:name, :archetype, :locked)
    end

    def serialize_player_character(character)
      character.as_json(only: [ :id, :user_id, :name, :icon, :locked, :archetype ])
    end
  end
end
