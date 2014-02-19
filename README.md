**Given JS** is a validation API for quickly specifying validation rules on a view model and its observables.  The main goal is to define clean, easy to read and testable validation rules that are **not** mixed in with the UI or other dependencies.

##Examples

Named rules

	var vm = new MyViewModel();
	            
	ko.given.viewModel(vm)
		.validate(vm.email)
			.addRule("email")
				.withErrorMessage("Please provide a valid email address.");

Custom rules defined in-line

	var vm = new MyViewModel();
	            
	ko.given.viewModel(vm)
		.validate(vm.firstName)
			.addRule(function(vm) {
				return vm.firstName().length > 0;
			});

Chained rules

	ko.given.viewModel(vm)
		.validate(vm.email)
			.addRule("email")
				.withErrorMessage("Please provide a valid email address.")
		.validate(vm.firstName)
			.addRule(function(vm) {
				return vm.firstName().length > 0;
			});

##How It Works
The example above shows the basics of defining a validation rule.  No need to bind to a UI elements or subscribe to observables to trigger the validation.  

The validation framework is largely driven by Knockout's computed observable awesomeness.  A computed observable is used to bind the rule logic to all of the observables used within the rule.  Therefore, as soon as any of the observables referenced in the rule are changed, the validation rule executes and updates the state of each computed observable specified as parameters to the **validate**() function.

Once an observable has been associated to a validation rule, it will have two sub-observables defined:

- **isValid** : true if observable is valid, false otherwise
- **errorMessages** : an array of error messages, one per failed validation rule

These are defined as properties on the observable itself.  Therefore, if you specify a rule such as:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
	    	.addRule(function(vm) { return vm.firstName().length > 0; });

The sub-observables will be defined as

- vm.firstName.isValid
- vm.firstName.errorMessages

You can then bind to these from your `data-bind` attributes in your HTML to automatically update the UI when errors occur.


##Specifying a view model
The validation context is centered around the concept of a view model.  Therefore, every rule needs to be bound to a single view model object.  This must be the first call in your chain:

	var vm = new MyViewModel();
	ko.given.viewModel(vm)


##Specifying observables

Once you have bound your context to a view model, you need to specify which observables are affected by the validation rule(s).  This is done with the **validate**() function which accepts multiple types of parameters, as described below.

###A Knockout observable
This type is used to bind a rule to a single knockout observable.

	ko.given.viewModel(vm)	
		.validate( vm.firstName );

###An array
This type is used to bind a rule to more than one Knockout observable.  The array cannot contain other types of objects.

	ko.given.viewModel(vm)	
		.validate( [ vm.firstName, vm.lastName ] );

###A Function
This type is used to specify a rule if you don't already have a reference to the view model.  The function must return a Knockout observable or an array containing only knockout observables.

	ko.given.viewModel(vm)	
		.validate( function(vm) {
			return vm.firstName;
		});

or

	ko.given.viewModel(vm)	
		.validate( function(vm) {
			return [ vm.firstName, vm.lastName ];
		});

##Specifying the rule logic

### Using Named Rules

The library comes with a few predefined rules that can be added to your validation easily by simply referencing it by name.

Example:

	ko.given.viewModel(vm)	
		.validate(vm.email)
			.addRule("email");

You can also specify parameters

	ko.given.viewModel(vm)	
		.validate(vm.firstName)
			.addRule("maxLength", 100);

#### Specifying your own named custom named rules

If your application has some specific logic that is repeated often, you can easily augment the existing named rules with your own.  The syntax looks like this:

Custom rule without parameters

	ko.given.validation.addNamedRule("isZero", function(vm, observable) {
		return observable() == 0;
	});

Custom rule with parameters

	ko.given.validation.addNamedRule("sumToFive", function(vm, observable, value1, value2) {
		return value1 + value2 == 5;
	});

As you can see, named rules can take a variable number of parameters.  All you do is specify a lambda expression that takes at least two parameters:
- vm : a reference to the view model
- observable : a reference to the observable being tested

Any parameter after that needs to be specified when calling addRule() on your context.  For example, in order to use the sumToFive example above, you would have to specify the rule like this:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule("sumToFive", 2, 3);

Note that if your observable context contains more than one observable, your lambda expression will get called once for every observable in the context.  If at least one of the observables fail the validation, every observable in the context is marked as invalid.  This is a convenience so that your named rule logic does not need to worry about whether the context contains more than one observable or not.

### Specifying rule logic in-line
Once the context has been saturated with a view model and the observables to validate, you need to specify the logic to determine whether the observable is valid or not.  This is done with **addRule**():

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule(function(vm) {
		        return vm.firstName().length > 0;
		    });
		    
The **addRule**() function accepts a callback which:

- Accepts the view model as a parameter
- Returns true if the observable(s) is/are valid, false otherwise.

You can also specify an error message using the `.withErrorMessage()` function:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule(function(vm) {
		        return vm.firstName().length > 0;
		    })
		    	.withErrorMessage('Please enter a valid first name.');

##Execute rules conditionally

Rules can be executed conditionally using the `.when()` function:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule(function(vm) {
		        return vm.firstName().length > 0;
		    })
		    	.when(function(vm) {
		    		return vm.isRegistering() == true;
		    	});


##Context Scope

The validation fluent interface maintains three levels of scope:

- View Model Context
- Observable Context
- Rule Context

Each one of these contexts allow different types of operation.  Before you do anything with the validation, you'll need to obtain a **View Model Context**.  This is done by calling `ko.given.viewModel()`.

You obtain a new **Observable Scope** every time you call `validate()`.

You obtain a new **Rule Scope** every time you call `addRule()`.

You can call any of these methods more than once to manage the context of your rules.  This allows you to specify all of the rules on your view model from a single chain of calls without having to repeat yourself:

    ko.given.viewModel(vm)
        .validate(vm.firstName)
            .addRule(function(vm) {
                return vm.firstName().length > 0;
            })
            
        .validate(vm.age)
            .addRule(function(vm) {
                return vm.age() >= 13;
            })
                .withErrorMessage('You must be 13 years or older.')
                .when(function(vm) { return vm.isRegistering() })
                
        .validate( [ vm.ob1, vm.ob2 ] )
            .addRule(function(vm) {
                // Some rule
            })
            .addRule(function(vm) {
                // Another rule
            })

##What's Next?

This library is still early in development and there are a few key features on the current roadmap:

- More named rules for common validation rules
- Ability to specify the trigger for the validation.  This is to allow specifying when a validation rule should be executed.  Some values could include:
	- **Auto** : as soon as the observable is set/changed
	- **On Validate** : add a method on the view model to trigger the validation and validation rules will not be executed before this method is called.  This could be desired in order to only show the validation error when the user completes a form.
	- **On Change** : observables are only flagged as invalid when the USER changes a field's value.
	- **On Blur** : similar to on change but it will trigger the field to be validated even if the value is not changed.
- Some knockout bindings to easily add validation state to your UI.
- Knockout bindings to easily integrate with Kendo UI.

##License
MIT License - [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)
