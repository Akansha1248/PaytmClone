#!/bin/bash

# PayWallet Ansible Deployment Script
# This script provides an easy way to deploy the PayWallet application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists ansible; then
        print_error "Ansible is not installed. Please install it first:"
        echo "  Ubuntu/Debian: sudo apt install ansible"
        echo "  macOS: brew install ansible"
        echo "  CentOS/RHEL: sudo yum install ansible"
        exit 1
    fi
    
    if ! command_exists ansible-playbook; then
        print_error "ansible-playbook command not found. Please install Ansible properly."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install Ansible requirements
install_requirements() {
    print_status "Installing Ansible requirements..."
    
    if [ -f "requirements.yml" ]; then
        ansible-galaxy install -r requirements.yml
        print_success "Ansible requirements installed"
    else
        print_warning "No requirements.yml found, skipping..."
    fi
}

# Function to test connection
test_connection() {
    print_status "Testing connection to servers..."
    
    if ansible -i inventory.ini webservers -m ping; then
        print_success "Connection test passed"
    else
        print_error "Connection test failed. Please check your inventory.ini and SSH configuration."
        exit 1
    fi
}

# Function to run deployment
run_deployment() {
    local playbook_file="playbook.yml"
    local inventory_file="inventory.ini"
    local extra_args="$@"
    
    print_status "Starting deployment..."
    print_status "Playbook: $playbook_file"
    print_status "Inventory: $inventory_file"
    
    if [ -n "$extra_args" ]; then
        print_status "Extra arguments: $extra_args"
    fi
    
    # Run the playbook
    ansible-playbook -i "$inventory_file" "$playbook_file" $extra_args
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
        print_status "Your application should now be available at:"
        print_status "  - http://YOUR_SERVER_IP (if no domain configured)"
        print_status "  - http://YOUR_DOMAIN (if domain configured)"
    else
        print_error "Deployment failed. Check the output above for errors."
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "PayWallet Ansible Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] [ANSIBLE_ARGS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -t, --test     Only test connection, don't deploy"
    echo "  -c, --check    Only check prerequisites, don't deploy"
    echo "  -v, --verbose  Run with verbose output"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy to all servers"
    echo "  $0 --test             # Test connection only"
    echo "  $0 --verbose          # Deploy with verbose output"
    echo "  $0 --limit production # Deploy only to production servers"
    echo "  $0 --tags deploy      # Run only deploy tasks"
    echo ""
    echo "Make sure to configure your servers in inventory.ini before running!"
}

# Main script logic
main() {
    local test_only=false
    local check_only=false
    local verbose=false
    local ansible_args=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--test)
                test_only=true
                shift
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                ansible_args="$ansible_args -v"
                shift
                ;;
            *)
                ansible_args="$ansible_args $1"
                shift
                ;;
        esac
    done
    
    # Change to script directory
    cd "$(dirname "$0")"
    
    # Check prerequisites
    check_prerequisites
    
    if [ "$check_only" = true ]; then
        print_success "Prerequisites check completed"
        exit 0
    fi
    
    # Install requirements
    install_requirements
    
    # Test connection
    test_connection
    
    if [ "$test_only" = true ]; then
        print_success "Connection test completed"
        exit 0
    fi
    
    # Run deployment
    run_deployment $ansible_args
}

# Run main function with all arguments
main "$@"
