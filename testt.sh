#!/bin/bash
set -e

# S'assurer d'être sur temp-branch
git checkout temp-branch

# Récupère les commits de main après la date voulue (du plus ancien au plus récent)
commits=$(git rev-list --reverse --after="2025-09-04 12:00" main)

if [ -z "$commits" ]; then
  echo "Aucun commit trouvé après la date. Rien à faire."
  exit 0
fi

for c in $commits; do
  echo
  echo "=== traitement de $c ==="

  # Ignore les commits de merge
  parent_count=$(git rev-list --parents -n 1 $c | wc -w)
  if [ "$parent_count" -gt 2 ]; then
    echo "Commit $c est un merge — je le saute."
    continue
  fi

  # Cherry-pick en acceptant automatiquement les modifications du commit
  git cherry-pick -X theirs $c || true

done

echo
echo "Tous les commits appliqués. Voici l'historique graphique :"
git --no-pager log --oneline --graph --decorate --all
