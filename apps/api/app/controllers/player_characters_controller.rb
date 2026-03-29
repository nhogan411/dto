class PlayerCharactersController < ApplicationController
  include JwtAuthenticatable

  before_action :authenticate_user!
  before_action :set_player_character, only: :update

  def index
    render json: { data: PlayerCharacter.for_owner(current_user).order(:id).map { |character| serialize_player_character(character) } }
  end

  def update
    if @player_character.update(player_character_params)
      render json: { data: serialize_player_character(@player_character) }
    else
      render json: { errors: @player_character.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_player_character
    @player_character = PlayerCharacter.for_owner(current_user).find_by(id: params[:id])
    return if @player_character

    render json: { errors: [ "Player character not found" ] }, status: :not_found
  end

  def player_character_params
    params.permit(:name, :archetype, :race)
  end

  def serialize_player_character(character)
    character.as_json(only: [ :id, :name, :icon, :locked, :archetype, :race ])
  end
end
