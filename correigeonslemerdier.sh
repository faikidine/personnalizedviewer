# Branch orpheline
git checkout --orphan nouveau-main

# Supprime tout
git rm -rf . 2>/dev/null || true

# Premier commit : .gitignore
git checkout main -- .gitignore
git add -A
git commit -m "first"

# Deuxième commit : initial (fichiers du commit initialll)
git checkout 3ebb048 -- .
git add -A
git commit -m "initial"

# Suivant : copier les fichiers de chaque commit suivant
COMMITS="60ad2e7 de98af2 3359afe 12d2f5c"
for c in $COMMITS; do
    git checkout $c -- .
    git add -A
    git commit -m "$(git log -1 --pretty=%B $c)"
done
