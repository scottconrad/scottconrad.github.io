##Coding Test
I had 48 hours to complete this, but I lost about 8 hours due to prior engagements.  A bit of whirlwind but it was fun. I spent some time making it look good.

[run it here](http://honopu.com/mobiquity)

<code>
Instructions
Please complete the challenge explained below within 48 hours of receiving the assignment. You should try to complete as much of the functionality as you can in the time allotted-- failure to include all functionality will not result in disqualification. To submit, please push the source code to your Github account and email a link to the repository when you are finished.

The assignment

Write a simple Google Calendar app that:

*	Allows the user to select a date to display.
*	Retrieves and displays the list of events for a hard-coded user account. (I never understood this one and wasn't provided a hard coded user account, if I just needed to parse a rss feed then I could have done that but i wasn't sure)
*	Allows a user to input a new event for a selected date.

Additional functionality

*	Utilize responsive web design for Print Layout, iPad, iPad Mini, or Samsung Galaxy Tab resolution.
*	Utilize an MVC framework such as Ember, Backbone, or AngularJS.
*	Utilize a CSS preprocessor such as LESS or SASS.
*	Integrate Google Authentication to show the current day’s calendar for any user that authenticates to Google

Grading criteria
The following will be evaluated in the following order:
1.	Code quality (40)
2.	Code organization (15)
3.	Functions as expected (15)
4.	Error handling / Negative test cases considered (10)
5.	Performance (10)
6.	Includes all required functionality (10)
</code>


##Results

I spent some extra time on my own making this look nice. I'm going to leave this public in the future so people can have a code sample.

I also intentionally didn't use the GAPI client. I could have used it and generally would have, but I thought with the angular integration i started as my base level it wasn't warranted to use it. I don't like re-inventing the wheel and I always defer to trusted libraries but here I wanted to show what I can do, not that I can google how to use gapi.

###Instructions for Reviewer by bullet item

1* Authenticate and select a calendar, the selected date(defaults to today) will be shown. If you change the date, the list updates.
2* I never understood this one and I emailed to clarify. I would and probably should have just parsed a public rss feed for a calendar but the request was just odd. Technically I could have just loaded in the calendar embedded and solved the requirement but obviously that isn't what you were looking for.  I'm happy to explain further.
3* This works fine, its the form on the left side. Please note when you add an event it updates the list as well for the selected calendar.
Additional Functionality
4* This is a bit of a dumb example from a UI perspective but the elements stack on an ipad
5* I used angular from the start, the recruiter said it was ok since I had planned to implement everything
6* I am using gulp that builds the .less into css
7*  The app does this from the start, when you authenticate you are given your list of calendars, when you select a calendar then today's events are shown above all of the events


##Thoughts

I think this is fairly robust, but given the timeline and my previous commitments I had to make the following shortcuts which will bug me until I get around to fixing them:

* I got a circular reference in my GoogleCalendarService which was really annoying. It stopped me from being able to inject my service into the httpInterceptor to set the invalid token directly there. I resorted to firing a rootScope event that the service listened for, which isn't necessarily bad in my opinion but it isn't the "purist" way of doing things, but it got done.

* This is set up on my personal domain for testing.. if you change the url you don't land there, you are back on the CMS install.  I didn't see this being a big deal but I did want to mention that I noticed this.

* I didn't filter past events, I didn't think it mattered and the spec didn't say I had to.

* Recurring events aren't currently supported, not mentioned. I used the API to sort the events for me, otherwise they were coming back in a really weird order. I figured order was more important

* If you have a ton of events, you'll eventually hit paging and not load all of them. I could have listened for the page result i believe in the responses then fired an append event.. but given the time I didn't think this was necessary and only think it's worth mentioning that I did in fact think of that.

* I should have created a UI element and a http Interceptor that showed and hid when we were pulling something from the API. I did this on the rental application so I know how to do it but I just didn't get to it on this.

##Fun

It was a lot of fun to do this, and I did really gold plate some stuff that I usually wouldn't. It's also great that anyone will be able to see this and be able to quickly judge my capability.
