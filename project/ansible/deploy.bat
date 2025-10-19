@echo off
REM PayWallet Ansible Deployment Script for Windows
REM This script provides an easy way to deploy the PayWallet application

setlocal enabledelayedexpansion

REM Colors for output (Windows doesn't support colors in batch, but we can use echo)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Function to print status
:print_status
echo %INFO% %~1
goto :eof

:print_success
echo %SUCCESS% %~1
goto :eof

:print_warning
echo %WARNING% %~1
goto :eof

:print_error
echo %ERROR% %~1
goto :eof

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking prerequisites..."

call :command_exists ansible
if %errorlevel% neq 0 (
    call :print_error "Ansible is not installed. Please install it first:"
    echo   Windows: Use WSL or install via pip: pip install ansible
    echo   Or use Windows Subsystem for Linux (WSL)
    exit /b 1
)

call :command_exists ansible-playbook
if %errorlevel% neq 0 (
    call :print_error "ansible-playbook command not found. Please install Ansible properly."
    exit /b 1
)

call :print_success "Prerequisites check passed"
goto :eof

REM Function to install Ansible requirements
:install_requirements
call :print_status "Installing Ansible requirements..."

if exist "requirements.yml" (
    ansible-galaxy install -r requirements.yml
    if %errorlevel% equ 0 (
        call :print_success "Ansible requirements installed"
    ) else (
        call :print_warning "Failed to install some requirements, continuing..."
    )
) else (
    call :print_warning "No requirements.yml found, skipping..."
)
goto :eof

REM Function to test connection
:test_connection
call :print_status "Testing connection to servers..."

ansible -i inventory.ini webservers -m ping
if %errorlevel% equ 0 (
    call :print_success "Connection test passed"
) else (
    call :print_error "Connection test failed. Please check your inventory.ini and SSH configuration."
    exit /b 1
)
goto :eof

REM Function to run deployment
:run_deployment
set "playbook_file=playbook.yml"
set "inventory_file=inventory.ini"
set "extra_args=%*"

call :print_status "Starting deployment..."
call :print_status "Playbook: %playbook_file%"
call :print_status "Inventory: %inventory_file%"

if not "%extra_args%"=="" (
    call :print_status "Extra arguments: %extra_args%"
)

REM Run the playbook
ansible-playbook -i "%inventory_file%" "%playbook_file%" %extra_args%

if %errorlevel% equ 0 (
    call :print_success "Deployment completed successfully!"
    call :print_status "Your application should now be available at:"
    call :print_status "  - http://YOUR_SERVER_IP (if no domain configured)"
    call :print_status "  - http://YOUR_DOMAIN (if domain configured)"
) else (
    call :print_error "Deployment failed. Check the output above for errors."
    exit /b 1
)
goto :eof

REM Function to show help
:show_help
echo PayWallet Ansible Deployment Script
echo.
echo Usage: %0 [OPTIONS] [ANSIBLE_ARGS]
echo.
echo Options:
echo   -h, --help     Show this help message
echo   -t, --test     Only test connection, don't deploy
echo   -c, --check    Only check prerequisites, don't deploy
echo   -v, --verbose  Run with verbose output
echo.
echo Examples:
echo   %0                    # Deploy to all servers
echo   %0 --test             # Test connection only
echo   %0 --verbose          # Deploy with verbose output
echo   %0 --limit production # Deploy only to production servers
echo   %0 --tags deploy      # Run only deploy tasks
echo.
echo Make sure to configure your servers in inventory.ini before running!
goto :eof

REM Main script logic
:main
set "test_only=false"
set "check_only=false"
set "verbose=false"
set "ansible_args="

REM Parse arguments
:parse_args
if "%~1"=="" goto :run_deployment_logic
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="-t" (
    set "test_only=true"
    shift
    goto :parse_args
)
if "%~1"=="--test" (
    set "test_only=true"
    shift
    goto :parse_args
)
if "%~1"=="-c" (
    set "check_only=true"
    shift
    goto :parse_args
)
if "%~1"=="--check" (
    set "check_only=true"
    shift
    goto :parse_args
)
if "%~1"=="-v" (
    set "verbose=true"
    set "ansible_args=%ansible_args% -v"
    shift
    goto :parse_args
)
if "%~1"=="--verbose" (
    set "verbose=true"
    set "ansible_args=%ansible_args% -v"
    shift
    goto :parse_args
)
set "ansible_args=%ansible_args% %~1"
shift
goto :parse_args

:run_deployment_logic
REM Change to script directory
cd /d "%~dp0"

REM Check prerequisites
call :check_prerequisites
if %errorlevel% neq 0 exit /b 1

if "%check_only%"=="true" (
    call :print_success "Prerequisites check completed"
    exit /b 0
)

REM Install requirements
call :install_requirements

REM Test connection
call :test_connection
if %errorlevel% neq 0 exit /b 1

if "%test_only%"=="true" (
    call :print_success "Connection test completed"
    exit /b 0
)

REM Run deployment
call :run_deployment %ansible_args%
goto :eof

REM Run main function with all arguments
call :main %*
