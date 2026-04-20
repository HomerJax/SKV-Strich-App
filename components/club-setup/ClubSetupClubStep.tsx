12:06:07.515 Running build in Washington, D.C., USA (East) – iad1
12:06:07.516 Build machine configuration: 2 cores, 8 GB
12:06:07.658 Retrieving list of deployment files...
12:06:08.155 Downloading 262 deployment files...
12:06:09.636 Restored build cache from previous deployment (22tzPgakr4kN5QyDz2YKWJhLBi5a)
12:06:09.824 Running "vercel build"
12:06:10.484 Vercel CLI 51.6.1
12:06:10.779 Installing dependencies...
12:06:11.911 
12:06:11.912 up to date in 926ms
12:06:11.913 
12:06:11.913 153 packages are looking for funding
12:06:11.913   run `npm fund` for details
12:06:11.941 Detected Next.js version: 16.2.3
12:06:11.945 Running "npm run build"
12:06:12.052 
12:06:12.052 > skv-strich-app@0.1.0 build
12:06:12.052 > next build
12:06:12.052 
12:06:12.903   Applying modifyConfig from Vercel
12:06:12.919 ▲ Next.js 16.2.3 (Turbopack)
12:06:12.920 - Experiments (use with caution):
12:06:12.920   · serverActions
12:06:12.921 
12:06:12.972   Creating an optimized production build ...
12:06:30.483 Turbopack build encountered 1 warnings:
12:06:30.484 ./next.config.ts
12:06:30.484 Encountered unexpected file in NFT list
12:06:30.484 A file was traced that indicates that the whole project was traced unintentionally. Somewhere in the import trace below, there are:
12:06:30.484 - filesystem operations (like path.join, path.resolve or fs.readFile), or
12:06:30.485 - very dynamic requires (like require('./' + foo)).
12:06:30.485 To resolve this, you can
12:06:30.485 - remove them if possible, or
12:06:30.485 - only use them in development, or
12:06:30.485 - make sure they are statically scoped to some subfolder: path.join(process.cwd(), 'data', bar), or
12:06:30.485 - add ignore comments: path.join(/*turbopackIgnore: true*/ process.cwd(), bar)
12:06:30.485 
12:06:30.485 Import trace:
12:06:30.485   App Route:
12:06:30.485     ./next.config.ts
12:06:30.486     ./lib/share/brand.ts
12:06:30.486     ./components/share/ShareCardShell.tsx
12:06:30.486     ./app/share/lineup/[id]/image/route.tsx
12:06:30.486 
12:06:30.486 
12:06:31.203 
12:06:31.203 > Build error occurred
12:06:31.206 Error: Turbopack build failed with 1 errors:
12:06:31.206 ./app/club-setup/page.tsx:8:1
12:06:31.206 Module not found: Can't resolve '@/components/club-setup/ClubSetupClubStep'
12:06:31.207   [90m 6 |[0m [36mimport[0m { createClubAction } [36mfrom[0m [32m"./actions"[0m;
12:06:31.207   [90m 7 |[0m [36mimport[0m { getFeatureFlagsForClub } [36mfrom[0m [32m"@/lib/feature-flags"[0m;
12:06:31.207 [31m[1m>[0m [90m 8 |[0m [36mimport[0m [33mClubSetupClubStep[0m [36mfrom[0m [32m"@/components/club-setup/ClubSetupClubStep"[0m;
12:06:31.207   [90m   |[0m [31m[1m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^[0m
12:06:31.207   [90m 9 |[0m [36mimport[0m [33mClubSetupSeasonStep[0m [36mfrom[0m [32m"@/components/club-setup/ClubSetupSeasonStep"[0m;
12:06:31.208   [90m10 |[0m [36mimport[0m [33mTeamGeneratorSettingsCard[0m [36mfrom[0m [32m"@/components/admin/settings/TeamGeneratorSettingsCa...[0m
12:06:31.208   [90m11 |[0m [36mimport[0m { [33mCategorySettingsSection[0m } [36mfrom[0m [32m"@/components/admin/settings/CategorySettingsSecti...[0m
12:06:31.208 
12:06:31.208 Import map: aliased to relative './components/club-setup/ClubSetupClubStep' inside of [project]/
12:06:31.208 
12:06:31.208 
12:06:31.208 Import trace:
12:06:31.208   App Route:
12:06:31.208     ./app/club-setup/page.tsx
12:06:31.208     ./lib/share/brand.ts
12:06:31.209     ./components/share/ShareCardShell.tsx
12:06:31.209     ./app/share/lineup/[id]/image/route.tsx
12:06:31.209 
12:06:31.209 https://nextjs.org/docs/messages/module-not-found
12:06:31.209 
12:06:31.209 
12:06:31.209     at <unknown> (./app/club-setup/page.tsx:8:1)
12:06:31.209     at <unknown> (https://nextjs.org/docs/messages/module-not-found)
12:06:31.270 Error: Command "npm run build" exited with 1