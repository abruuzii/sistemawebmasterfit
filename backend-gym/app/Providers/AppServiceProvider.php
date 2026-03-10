<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */


public function boot(): void
{
    ResetPassword::createUrlUsing(function ($notifiable, string $token) {
        $email = urlencode($notifiable->getEmailForPasswordReset());
        $base = rtrim(config('app.frontend_url'), '/');
        return "{$base}/reset-password.html?token={$token}&email={$email}";
    });
}

}
