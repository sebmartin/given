**Given JS** adds additional functionality to the Knockout JS library using a streamlined fluent interface.  The first feature being developed is fluent validation API for adding quick and clean client side validation to your forms.  

##Validation

The validation API allows for quickly specifying validation rules around a view model and its observables.  The main goal is to end up with clean and easy to read validation rules that are mixed in with the UI or other dependencies.

###Example


	var vm = new MyViewModel();
	            
	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule(function(vm) {
		        return vm.firstName().length > 0;
		    });

###How It Works
This is all you need to set a validation rule.  No need to bind to a UI elements or subscribe to observables to trigger the validation.  

The validation framework is largely driven by Knockout's computed observable awesomeness.  A computed observable is used to bind the rule logic to all of the observables used within the rule.  Therefore, as soon as any of the observables referenced in the rule are changed, the validation rule executes and updates the state of each computed observable specified with the a call to the **validate**() function.

Once an observable has been bound to a validation context, it will have two sub-observables defined:

- **isValid** : true if observable is valid, false otherwise
- **errorMessages** : an array of error messages, one per failed validation rule

These are defined as properties on the observable itself.  Therefore, if you specify a rule such as:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
	    	.addRule(function(vm) { return vm.firstName().length > 0; });

The sub-observables will be defined as

- vm.firstName.isValid
- vm.firstName.errorMessages

You can then bind to these from your `data-bind` attributes in your HTML to update the UI when errors occur.


###Specifying a view model
The validation context is centered around the concept of a view model.  Therefore, every rule needs to be bound to a single view model object.  This must be the first call in your chain:

	var vm = new MyViewModel();
	ko.given.viewModel(vm)


###Specifying observables

Once you have bound your context to a view model, you need to specify which observables are affected by the validation rule(s).  This is done with the **validate**() function which accepts multiple types of parameters, as described below.

####A Knockout observable
This type is used to bind a rule to to a single knockout observable.

	ko.given.viewModel(vm)	
		.validate( vm.firstName );

####An array
This type is used to bind a rule to more than one Knockout observable.  The array cannot contain other types of objects.

	ko.given.viewModel(vm)	
		.validate( [ vm.firstName, vm.lastName ] );

####A Function
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

###Specifying the rule logic

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

###Execute rules conditionally

Rules can be executed conditionally using the `.when()` function:

	ko.given.viewModel(vm)
	    .validate(vm.firstName)
		    .addRule(function(vm) {
		        return vm.firstName().length > 0;
		    })
		    	.when(function(vm) {
		    		return vm.isRegistering() == true;
		    	});


###Context Scope

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

###What's Next?

There are a few key features on the current roadmap:

- Named rules for the most common validation rules (required, min, max, numeric, etc.)
- Ability to specify the trigger for the validation.  This is to allow specifying when a validation rule should be executed.  Some values could include:
	- **Auto** : as soon as the observable is set/changed
	- **On Validate** : add a method on the view model to trigger the validation and validation rules will not be executed before this method is called.  This could be desired in order to only show the validation error when the user completes a form.
	- **On Change** : observables are only flagged as invalid when the USER changes a field's value.
	- **On Blur** : similar to on change but it will trigger the field to be validated even if the value is not changed.
- Some knockout bindings to easily add validation state to your UI.
- Knockout bindings to easily integrate with Kendo UI.

##License
MIT License - [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)
