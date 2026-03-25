# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

require_relative "seeds/player_character_names"

puts "=" * 60
puts "SEEDING DATABASE WITH DEVELOPMENT DATA"
puts "=" * 60

# SECTION 1: CREATE USERS (idempotent)
puts "\n[Section 1] Creating users..."

nhogan = User.find_or_create_by!(email: "nhogan411@gmail.com") do |user|
  user.username = "nhogan411"
  user.password = "Passw0rd"
end
nhogan.update!(role: :admin)
puts "  ✓ nhogan411"

thebadone = User.find_or_create_by!(email: "thebadone411@gmail.com") do |user|
  user.username = "thebadone411"
  user.password = "Passw0rd"
end
puts "  ✓ thebadone411"

kaelthas = User.find_or_create_by!(email: "kaelthas@testmail.dev") do |user|
  user.username = "kaelthas"
  user.password = "Passw0rd"
end
puts "  ✓ kaelthas"

mordecai = User.find_or_create_by!(email: "mordecai@testmail.dev") do |user|
  user.username = "mordecai"
  user.password = "Passw0rd"
end
puts "  ✓ mordecai"

zephyrine = User.find_or_create_by!(email: "zephyrine@testmail.dev") do |user|
  user.username = "zephyrine"
  user.password = "Passw0rd"
end
puts "  ✓ zephyrine"

sylvara = User.find_or_create_by!(email: "sylvara@testmail.dev") do |user|
  user.username = "sylvara"
  user.password = "Passw0rd"
end
puts "  ✓ sylvara"

bramwell = User.find_or_create_by!(email: "bramwell@testmail.dev") do |user|
  user.username = "bramwell"
  user.password = "Passw0rd"
end
puts "  ✓ bramwell"

veskara = User.find_or_create_by!(email: "veskara@testmail.dev") do |user|
  user.username = "veskara"
  user.password = "Passw0rd"
end
puts "  ✓ veskara"

all_users = [ nhogan, thebadone, kaelthas, mordecai, zephyrine, sylvara, bramwell, veskara ]
puts "Users created: #{all_users.count}"

# SECTION 2: PROVISION PLAYER CHARACTERS (idempotent)
puts "\n[Section 2] Provisioning player characters..."

all_users.each do |user|
  if user.player_characters.empty?
    PlayerCharacter.provision_for(user)
    puts "  ✓ #{user.username}: 6 characters provisioned"
  else
    puts "  ✓ #{user.username}: already has #{user.player_characters.count} characters"
  end
end

# SECTION 3: CREATE FRIENDSHIPS (idempotent, respecting no_reverse_duplicate)
puts "\n[Section 3] Creating friendships..."

friendships_to_create = [
  [ nhogan, thebadone ],
  [ nhogan, kaelthas ],
  [ nhogan, mordecai ],
  [ nhogan, zephyrine ],
  [ thebadone, kaelthas ],
  [ thebadone, sylvara ],
  [ kaelthas, zephyrine ],
  [ mordecai, sylvara ],
  [ zephyrine, bramwell ],
  [ sylvara, bramwell ],
  [ bramwell, veskara ]
]

created_count = 0
friendships_to_create.each do |requester, recipient|
  # Check both directions to respect no_reverse_duplicate validation
  unless Friendship.exists?(requester_id: requester.id, recipient_id: recipient.id) ||
         Friendship.exists?(requester_id: recipient.id, recipient_id: requester.id)
    Friendship.create!(requester: requester, recipient: recipient, status: :accepted)
    created_count += 1
    puts "  ✓ #{requester.username} ↔ #{recipient.username}"
  else
    puts "  ✓ #{requester.username} ↔ #{recipient.username} (already exists)"
  end
end

puts "Friendships created: #{created_count}"
puts "Total friendships: #{Friendship.accepted.count}"

# FINAL SUMMARY
puts "\n" + "=" * 60
puts "SEED COMPLETE"
puts "=" * 60
puts "\nDevelopment Account Credentials:"
puts "  nhogan411 / Passw0rd (nhogan411@gmail.com)"
puts "  thebadone411 / Passw0rd (thebadone411@gmail.com)"
puts "\nDatabase Stats:"
puts "  Users: #{User.count}"
puts "  Player Characters: #{PlayerCharacter.count}"
puts "  Accepted Friendships: #{Friendship.accepted.count}"
puts "=" * 60 + "\n"
