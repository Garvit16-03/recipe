<?php
// api.php

header('Content-Type: application/json');

require_once __DIR__ . '/backend/auth.php';
require_once __DIR__ . '/backend/recipes.php';
require_once __DIR__ . '/backend/favorites.php';

// Parse incoming request data
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

$requestData = [];
if ($method === 'POST') {
    // Check if JSON payload
    $contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
    if (strpos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        $requestData = json_decode($json, true) ?: [];
    } else {
        $requestData = $_POST;
    }
} else {
    $requestData = $_GET;
}

$response = ['success' => false, 'message' => 'Invalid action or method.'];

switch ($action) {
    case 'auth_status':
        $response = getSessionStatus();
        if ($response['loggedIn']) {
            $response['favoriteIds'] = getUserFavoriteIds();
        } else {
            $response['favoriteIds'] = [];
        }
        $response['success'] = true;
        break;

    case 'register':
        if ($method === 'POST') {
            $username = isset($requestData['username']) ? trim($requestData['username']) : '';
            $password = isset($requestData['password']) ? trim($requestData['password']) : '';
            $response = registerUser($username, $password);
        } else {
            $response = ['success' => false, 'message' => 'Post method required for registration.'];
        }
        break;

    case 'login':
        if ($method === 'POST') {
            $username = isset($requestData['username']) ? trim($requestData['username']) : '';
            $password = isset($requestData['password']) ? trim($requestData['password']) : '';
            $response = loginUser($username, $password);
        } else {
            $response = ['success' => false, 'message' => 'Post method required for login.'];
        }
        break;

    case 'logout':
        $response = logoutUser();
        break;

    case 'get_recipes':
        $query = isset($requestData['query']) ? trim($requestData['query']) : '';
        $category = isset($requestData['category']) ? trim($requestData['category']) : '';
        $onlyMyRecipes = isset($requestData['my_recipes']) && ($requestData['my_recipes'] === 'true' || $requestData['my_recipes'] === true);
        
        $recipes = getRecipes($query, $category, $onlyMyRecipes);
        $favIds = getUserFavoriteIds();
        
        // Enhance recipe objects with isFavorited status
        foreach ($recipes as &$recipe) {
            $recipe['isFavorited'] = in_array($recipe['id'], $favIds);
        }
        unset($recipe);
        
        $response = [
            'success' => true,
            'recipes' => $recipes
        ];
        break;

    case 'get_recipe_details':
        $id = isset($requestData['id']) ? trim($requestData['id']) : '';
        $response = getRecipeDetails($id);
        if ($response['success']) {
            $favIds = getUserFavoriteIds();
            $response['recipe']['isFavorited'] = in_array($id, $favIds);
        }
        break;

    case 'add_recipe':
        if ($method === 'POST') {
            $response = addCustomRecipe($requestData);
        } else {
            $response = ['success' => false, 'message' => 'Post method required to create recipe.'];
        }
        break;

    case 'delete_recipe':
        if ($method === 'POST' || (isset($requestData['_method']) && $requestData['_method'] === 'DELETE')) {
            $id = isset($requestData['id']) ? trim($requestData['id']) : '';
            $response = deleteCustomRecipe($id);
        } else {
            $response = ['success' => false, 'message' => 'Valid delete method required.'];
        }
        break;

    case 'toggle_favorite':
        if ($method === 'POST') {
            $id = isset($requestData['id']) ? trim($requestData['id']) : '';
            $response = toggleFavoriteRecipe($id);
        } else {
            $response = ['success' => false, 'message' => 'Post method required to favorite recipes.'];
        }
        break;

    case 'get_favorites':
        $response = getUserFavorites();
        if ($response['success']) {
            foreach ($response['favorites'] as &$recipe) {
                $recipe['isFavorited'] = true;
            }
            unset($recipe);
        }
        break;

    default:
        $response = ['success' => false, 'message' => 'Unknown action: ' . $action];
        break;
}

echo json_encode($response);
exit;
